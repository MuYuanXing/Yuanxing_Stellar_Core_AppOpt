#!/system/bin/sh
MODDIR="${0%/*}"
SETTINGS_FILE="${MODDIR}/settings.conf"
CONFIG_FILE="${MODDIR}/applist.conf"
CONFIG_DIR="${MODDIR}/config"
LOG_FILE="${MODDIR}/service.log"
PERF_CONFIG_FILE="${CONFIG_DIR}/app_performance.json"
RUNTIME_DIR="${MODDIR}/runtime"
LOCK_DIR="${RUNTIME_DIR}/oiface.lock"
OIFACE_STATE_FILE="${RUNTIME_DIR}/oiface_state"

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG_FILE}"
}

wait_sys_boot_completed() {
    local i=9
    until [[ "$(getprop sys.boot_completed)" == "1" ]] || [[ "${i}" -le 0 ]]; do
        i=$((i - 1))
        sleep 9
    done
}

init_runtime() {
    mkdir -p "${RUNTIME_DIR}"
    rmdir "${LOCK_DIR}" 2>/dev/null
    echo "on" > "${OIFACE_STATE_FILE}"
}

update_device_info() {
    local cpu_info_file="${MODDIR}/cpu_info.conf"
    [[ ! -f "${cpu_info_file}" ]] && return
    local new_kernel=$(uname -r)
    sed -i "s/^kernel_ver=.*/kernel_ver=${new_kernel}/" "${cpu_info_file}"
}

acquire_lock() {
    local max_wait=50
    local i=0
    while ! mkdir "${LOCK_DIR}" 2>/dev/null; do
        i=$((i + 1))
        if [[ "${i}" -ge "${max_wait}" ]]; then
            rmdir "${LOCK_DIR}" 2>/dev/null
            mkdir "${LOCK_DIR}" 2>/dev/null
            break
        fi
        sleep 0.1 2>/dev/null || sleep 1
    done
}

release_lock() {
    rmdir "${LOCK_DIR}" 2>/dev/null
}

get_oiface_state() {
    cat "${OIFACE_STATE_FILE}" 2>/dev/null || echo "on"
}

set_oiface_state() {
    local new_state="$1"
    local reason="$2"
    acquire_lock
    local current=$(cat "${OIFACE_STATE_FILE}" 2>/dev/null || echo "on")
    if [[ "${current}" != "${new_state}" ]]; then
        if [[ "${new_state}" == "off" ]]; then
            stop oiface 2>/dev/null
        else
            start oiface 2>/dev/null
        fi
        echo "${new_state}" > "${OIFACE_STATE_FILE}"
        log_msg "[OiFace] ${current} → ${new_state} (${reason})"
    fi
    release_lock
}

read_settings() {
    ENABLED=1
    OIFACE_DISABLED=0
    OIFACE_SMART=0
    OIFACE_INTERVAL=3
    PERF_DEFAULT_ENABLED=0
    PERF_APP_ENABLED=0
    if [[ -f "${SETTINGS_FILE}" ]]; then
        ENABLED=$(grep "^enabled=" "${SETTINGS_FILE}" | cut -d= -f2)
        OIFACE_DISABLED=$(grep "^oiface_disabled=" "${SETTINGS_FILE}" | cut -d= -f2)
        OIFACE_SMART=$(grep "^oiface_smart=" "${SETTINGS_FILE}" | cut -d= -f2)
        OIFACE_INTERVAL=$(grep "^oiface_interval=" "${SETTINGS_FILE}" | cut -d= -f2)
        PERF_DEFAULT_ENABLED=$(grep "^perf_default_enabled=" "${SETTINGS_FILE}" | cut -d= -f2)
        PERF_APP_ENABLED=$(grep "^perf_app_enabled=" "${SETTINGS_FILE}" | cut -d= -f2)
    fi
    [[ -z "${ENABLED}" ]] && ENABLED=1
    [[ -z "${OIFACE_DISABLED}" ]] && OIFACE_DISABLED=0
    [[ -z "${OIFACE_SMART}" ]] && OIFACE_SMART=0
    [[ -z "${OIFACE_INTERVAL}" ]] && OIFACE_INTERVAL=3
    [[ -z "${PERF_DEFAULT_ENABLED}" ]] && PERF_DEFAULT_ENABLED=0
    [[ -z "${PERF_APP_ENABLED}" ]] && PERF_APP_ENABLED=0
}

get_json_string() {
    local file="$1"
    local key="$2"
    grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$file" 2>/dev/null | \
        sed 's/.*:[[:space:]]*"\([^"]*\)".*/\1/' | head -n 1
}

get_json_number() {
    local file="$1"
    local key="$2"
    grep -o "\"${key}\"[[:space:]]*:[[:space:]]*[0-9]*" "$file" 2>/dev/null | \
        grep -o '[0-9]*$' | head -n 1
}

get_json_bool() {
    local file="$1"
    local key="$2"
    local result=$(grep -o "\"${key}\"[[:space:]]*:[[:space:]]*\(true\|false\)" "$file" 2>/dev/null | \
        grep -o '\(true\|false\)$' | head -n 1)
    [[ "${result}" == "true" ]] && echo "1" || echo "0"
}

get_rule_packages() {
    if [[ -f "${CONFIG_FILE}" ]]; then
        grep -v "^#" "${CONFIG_FILE}" | grep -v "^$" | sed 's/[{:=].*//g' | sort -u
    fi
}

get_foreground_package() {
    dumpsys activity activities 2>/dev/null | grep topResumedActivity= | tail -n 1 | cut -d '{' -f2 | cut -d '/' -f1 | cut -d ' ' -f3
}

is_package_in_rules() {
    local pkg="$1"
    local packages
    packages=$(get_rule_packages)
    echo "${packages}" | grep -q "^${pkg}$"
}

apply_io_config() {
    local io_config="${CONFIG_DIR}/io_scheduler.conf"
    if [[ -f "${io_config}" ]]; then
        local scheduler
        local readahead
        scheduler=$(grep "^scheduler=" "${io_config}" | cut -d'=' -f2)
        readahead=$(grep "^readahead=" "${io_config}" | cut -d'=' -f2)
        if [[ -n "${scheduler}" ]]; then
            for f in /sys/block/*/queue/scheduler; do
                echo "${scheduler}" > "${f}" 2>/dev/null
            done
            log_msg "IO调度器已设置: ${scheduler}"
        fi
        if [[ -n "${readahead}" ]]; then
            for f in /sys/block/*/queue/read_ahead_kb; do
                echo "${readahead}" > "${f}" 2>/dev/null
            done
            log_msg "预读取已设置: ${readahead}KB"
        fi
    fi
}

apply_priority_to_process() {
    local process_name="$1"
    local nice_val="$2"
    local io_class="$3"
    local io_level="$4"
    local pids
    pids=$(pgrep -f "${process_name}" 2>/dev/null)
    if [[ -n "${pids}" ]]; then
        for pid in ${pids}; do
            renice -n "${nice_val}" -p "${pid}" 2>/dev/null
            ionice -c "${io_class}" -n "${io_level}" -p "${pid}" 2>/dev/null
        done
    fi
}

apply_process_priority() {
    if [[ ! -f "${CONFIG_FILE}" ]]; then
        return
    fi
    local current_pkg=""
    local current_nice=""
    local current_io_class=""
    local current_io_level=""
    while IFS= read -r line; do
        if echo "${line}" | grep -q "^# @priority:"; then
            local priority_str
            local io_part
            priority_str=$(echo "${line}" | sed 's/^# @priority://')
            current_nice=$(echo "${priority_str}" | grep -o 'nice=[^,]*' | cut -d'=' -f2)
            io_part=$(echo "${priority_str}" | grep -o 'io=[^,]*' | cut -d'=' -f2)
            current_io_class=$(echo "${io_part}" | cut -d'-' -f1)
            current_io_level=$(echo "${io_part}" | cut -d'-' -f2)
            continue
        fi
        if echo "${line}" | grep -q "^#\|^$"; then
            continue
        fi
        local pkg
        pkg=$(echo "${line}" | cut -d'=' -f1 | cut -d'{' -f1 | cut -d':' -f1)
        if [[ -n "${current_pkg}" ]] && [[ "${pkg}" != "${current_pkg}" ]]; then
            if [[ -n "${current_nice}" ]]; then
                apply_priority_to_process "${current_pkg}" "${current_nice}" "${current_io_class}" "${current_io_level}"
            fi
            current_nice=""
            current_io_class=""
            current_io_level=""
        fi
        current_pkg="${pkg}"
    done < "${CONFIG_FILE}"
    if [[ -n "${current_pkg}" ]] && [[ -n "${current_nice}" ]]; then
        apply_priority_to_process "${current_pkg}" "${current_nice}" "${current_io_class}" "${current_io_level}"
    fi
}

priority_daemon() {
    while true; do
        sleep 300
        apply_process_priority
    done
}

get_perf_interval() {
    if [[ -f "${PERF_CONFIG_FILE}" ]]; then
        local interval
        interval=$(get_json_number "${PERF_CONFIG_FILE}" "interval")
        [[ -n "${interval}" ]] && [[ "${interval}" -gt 0 ]] 2>/dev/null && echo "${interval}" && return
    fi
    echo "1"
}

extract_app_block() {
    local file="$1"
    local pkg="$2"
    awk -v pkg="\"${pkg}\"" '
    BEGIN { found=0; depth=0; block="" }
    {
        line = $0
        if (found == 0) {
            pos = index(line, pkg)
            if (pos > 0) {
                rest = substr(line, pos + length(pkg))
                colonPos = index(rest, ":")
                if (colonPos > 0) {
                    found = 1
                    line = substr(rest, colonPos + 1)
                    gsub(/^[ \t]+/, "", line)
                }
            }
        }
        if (found == 1) {
            for (i = 1; i <= length(line); i++) {
                c = substr(line, i, 1)
                if (c == "{") depth++
                if (c == "}") depth--
                block = block c
                if (depth == 0 && length(block) > 0) {
                    print block
                    exit
                }
            }
        }
    }' "$file" 2>/dev/null
}

get_app_perf_config() {
    local pkg="$1"
    local key="$2"
    if [[ -f "${PERF_CONFIG_FILE}" ]]; then
        local block
        block=$(extract_app_block "${PERF_CONFIG_FILE}" "${pkg}")
        if [[ -n "${block}" ]]; then
            case "${key}" in
                disableOiface)
                    echo "${block}" | grep -q '"disableOiface"[[:space:]]*:[[:space:]]*true' && echo "1" || echo "0"
                    ;;
                scheduler)
                    echo "${block}" | grep -o '"scheduler"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
                    ;;
                readahead)
                    echo "${block}" | grep -o '"readahead"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$'
                    ;;
                governor)
                    echo "${block}" | grep -o '"governor"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
                    ;;
            esac
        fi
    fi
}

has_app_perf_config() {
    local pkg="$1"
    if [[ -f "${PERF_CONFIG_FILE}" ]]; then
        grep -q "\"${pkg}\"[[:space:]]*:" "${PERF_CONFIG_FILE}" && return 0
    fi
    return 1
}

apply_scheduler() {
    local scheduler="$1"
    if [[ -n "${scheduler}" ]]; then
        for f in /sys/block/*/queue/scheduler; do
            echo "${scheduler}" > "${f}" 2>/dev/null
        done
    fi
}

apply_readahead() {
    local readahead="$1"
    if [[ -n "${readahead}" ]] && [[ "${readahead}" -gt 0 ]] 2>/dev/null; then
        for f in /sys/block/*/queue/read_ahead_kb; do
            echo "${readahead}" > "${f}" 2>/dev/null
        done
    fi
}

apply_governor() {
    local governor="$1"
    if [[ -n "${governor}" ]]; then
        for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
            echo "${governor}" > "${f}" 2>/dev/null
        done
    fi
}

get_default_perf_config() {
    local key="$1"
    if [[ -f "${PERF_CONFIG_FILE}" ]]; then
        local block
        block=$(extract_app_block "${PERF_CONFIG_FILE}" "default")
        if [[ -n "${block}" ]]; then
            case "${key}" in
                scheduler)
                    echo "${block}" | grep -o '"scheduler"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
                    ;;
                readahead)
                    echo "${block}" | grep -o '"readahead"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$'
                    ;;
                governor)
                    echo "${block}" | grep -o '"governor"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
                    ;;
            esac
        fi
    fi
}

restore_default_perf() {
    read_settings
    if [[ "${PERF_DEFAULT_ENABLED}" != "1" ]]; then
        return
    fi
    local def_scheduler
    local def_readahead
    local def_governor
    def_scheduler=$(get_default_perf_config "scheduler")
    def_readahead=$(get_default_perf_config "readahead")
    def_governor=$(get_default_perf_config "governor")
    [[ -n "${def_scheduler}" ]] && apply_scheduler "${def_scheduler}"
    [[ -n "${def_readahead}" ]] && [[ "${def_readahead}" -gt 0 ]] 2>/dev/null && apply_readahead "${def_readahead}"
    [[ -n "${def_governor}" ]] && apply_governor "${def_governor}"
}

perf_daemon() {
    local LAST_PERF_PKG=""
    while true; do
        local interval
        interval=$(get_perf_interval)
        sleep "${interval}"
        read_settings
        if [[ "${PERF_APP_ENABLED}" != "1" ]]; then
            if [[ -n "${LAST_PERF_PKG}" ]]; then
                restore_default_perf
                LAST_PERF_PKG=""
            fi
            continue
        fi
        local FG_PKG
        FG_PKG=$(get_foreground_package)
        if [[ -z "${FG_PKG}" ]]; then
            continue
        fi
        if [[ "${FG_PKG}" != "${LAST_PERF_PKG}" ]]; then
            if has_app_perf_config "${FG_PKG}"; then
                local app_scheduler
                local app_readahead
                local app_governor
                local app_disable_oiface
                app_scheduler=$(get_app_perf_config "${FG_PKG}" "scheduler")
                app_readahead=$(get_app_perf_config "${FG_PKG}" "readahead")
                app_governor=$(get_app_perf_config "${FG_PKG}" "governor")
                app_disable_oiface=$(get_app_perf_config "${FG_PKG}" "disableOiface")
                [[ -n "${app_scheduler}" ]] && apply_scheduler "${app_scheduler}"
                [[ -n "${app_readahead}" ]] && [[ "${app_readahead}" -gt 0 ]] 2>/dev/null && apply_readahead "${app_readahead}"
                [[ -n "${app_governor}" ]] && apply_governor "${app_governor}"
                if [[ "${app_disable_oiface}" == "1" ]] && [[ "${OIFACE_SMART}" != "1" ]] && [[ "${OIFACE_DISABLED}" != "1" ]]; then
                    set_oiface_state "off" "性能配置:${FG_PKG}"
                fi
                log_msg "[性能配置] 已应用: ${FG_PKG}"
            else
                if [[ -n "${LAST_PERF_PKG}" ]] && has_app_perf_config "${LAST_PERF_PKG}"; then
                    restore_default_perf
                    local last_disable=$(get_app_perf_config "${LAST_PERF_PKG}" "disableOiface")
                    if [[ "${last_disable}" == "1" ]] && [[ "${OIFACE_SMART}" != "1" ]] && [[ "${OIFACE_DISABLED}" != "1" ]]; then
                        set_oiface_state "on" "性能配置:恢复默认"
                    fi
                    log_msg "[性能配置] 已恢复默认配置"
                fi
            fi
            LAST_PERF_PKG="${FG_PKG}"
        fi
    done
}

settings_daemon() {
    local LAST_ENABLED="${ENABLED}"
    local LAST_OIFACE_DISABLED="${OIFACE_DISABLED}"
    local LAST_OIFACE_SMART="${OIFACE_SMART}"
    while true; do
        sleep 2
        read_settings
        if [[ "${ENABLED}" != "${LAST_ENABLED}" ]]; then
            if [[ "${ENABLED}" == "1" ]]; then
                killall AppOpt 2>/dev/null
                sleep 1
                nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
                log_msg "AppOpt 已启用并启动, PID: $!"
            else
                killall AppOpt 2>/dev/null
                log_msg "AppOpt 已禁用并停止"
            fi
            LAST_ENABLED="${ENABLED}"
        fi
        if [[ "${ENABLED}" == "1" ]]; then
            if ! pidof AppOpt >/dev/null 2>&1; then
                nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
                log_msg "AppOpt 意外停止, 已重新启动, PID: $!"
            fi
        fi
        if [[ "${OIFACE_DISABLED}" != "${LAST_OIFACE_DISABLED}" ]]; then
            if [[ "${OIFACE_DISABLED}" == "1" ]]; then
                set_oiface_state "off" "全局禁用"
            else
                set_oiface_state "on" "全局启用"
            fi
            LAST_OIFACE_DISABLED="${OIFACE_DISABLED}"
        fi
        if [[ "${OIFACE_SMART}" != "${LAST_OIFACE_SMART}" ]]; then
            if [[ "${OIFACE_SMART}" == "1" ]]; then
                log_msg "智能OiFace模式已启用"
            else
                if [[ "$(get_oiface_state)" == "off" ]] && [[ "${OIFACE_DISABLED}" != "1" ]]; then
                    set_oiface_state "on" "智能模式关闭"
                fi
                log_msg "智能OiFace模式已禁用"
            fi
            LAST_OIFACE_SMART="${OIFACE_SMART}"
        fi
    done
}

smart_oiface_daemon() {
    local counter=0
    while true; do
        sleep 1
        read_settings
        if [[ "${OIFACE_SMART}" == "1" ]] && [[ "${OIFACE_DISABLED}" != "1" ]]; then
            counter=$((counter + 1))
            if [[ "${counter}" -ge "${OIFACE_INTERVAL}" ]]; then
                counter=0
                local FG_PKG
                FG_PKG=$(get_foreground_package)
                if [[ -n "${FG_PKG}" ]]; then
                    if is_package_in_rules "${FG_PKG}"; then
                        set_oiface_state "off" "智能模式:${FG_PKG}"
                    else
                        set_oiface_state "on" "智能模式:非规则应用"
                    fi
                fi
            fi
        else
            counter=0
        fi
    done
}

wait_sys_boot_completed
cd "${MODDIR}" || exit 1

mkdir -p "${CONFIG_DIR}"
init_runtime
update_device_info

echo "" > "${LOG_FILE}"
log_msg "星核线程服务启动中"

read_settings

apply_io_config
log_msg "IO配置已应用"

apply_process_priority
log_msg "进程优先级已应用"

priority_daemon &
log_msg "优先级守护进程已启动"

if [[ "${ENABLED}" == "1" ]] && [[ -f "${MODDIR}/AppOpt" ]]; then
    chmod +x "${MODDIR}/AppOpt"
    nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
    log_msg "AppOpt 已启动, PID: $!"
else
    log_msg "AppOpt 未启动 (enabled=${ENABLED})"
fi

log_msg "正在解锁CPU核心..."
for MAX_CPUS in /sys/devices/system/cpu/cpu*/core_ctl/max_cpus; do
    if [[ -e "${MAX_CPUS}" ]] && [[ "$(cat "${MAX_CPUS}")" != "$(cat "${MAX_CPUS%/*}/min_cpus")" ]]; then
        chmod a+w "${MAX_CPUS%/*}/min_cpus"
        echo "$(cat "${MAX_CPUS}")" > "${MAX_CPUS%/*}/min_cpus"
        chmod a-w "${MAX_CPUS%/*}/min_cpus"
    fi
done
log_msg "CPU核心解锁完成"

if [[ "${OIFACE_DISABLED}" == "1" ]]; then
    set_oiface_state "off" "启动时全局禁用"
fi

settings_daemon &
log_msg "设置监控守护进程已启动"

smart_oiface_daemon &
log_msg "智能OiFace守护进程已启动"

perf_daemon &
log_msg "性能配置守护进程已启动"

log_msg "服务初始化完成"
