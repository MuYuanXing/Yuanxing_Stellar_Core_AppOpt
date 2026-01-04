#!/system/bin/sh
MODDIR="${0%/*}"
SETTINGS="${MODDIR}/settings.conf"
APPLIST="${MODDIR}/applist.conf"
CFGDIR="${MODDIR}/config"
LOG="${MODDIR}/service.log"
PERFCFG="${CFGDIR}/app_performance.json"
RUNDIR="${MODDIR}/runtime"
LOCKDIR="${RUNDIR}/oiface.lock"
OIFACE_STATE="${RUNDIR}/oiface_state"
ORIG_STATE="${RUNDIR}/original_state.conf"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG}"
}

wait_boot() {
    local i=9
    until [[ "$(getprop sys.boot_completed)" == "1" ]] || [[ "${i}" -le 0 ]]; do
        i=$((i - 1))
        sleep 9
    done
}

init_runtime() {
    mkdir -p "${RUNDIR}"
    rmdir "${LOCKDIR}" 2>/dev/null
    echo "on" > "${OIFACE_STATE}"
}

save_orig_state() {
    [[ -f "${ORIG_STATE}" ]] && return
    {
        for f in /sys/block/*/queue/scheduler; do
            [[ -f "$f" ]] || continue
            local cur=$(cat "$f" | grep -o '\[[^]]*\]' | tr -d '[]')
            [[ -n "$cur" ]] && echo "sched:${f}:${cur}"
        done
        for f in /sys/block/*/queue/read_ahead_kb; do
            [[ -f "$f" ]] && echo "readahead:${f}:$(cat $f)"
        done
        for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
            [[ -f "$f" ]] && echo "gov:${f}:$(cat $f)"
        done
        for f in /sys/devices/system/cpu/cpu*/core_ctl/min_cpus; do
            [[ -f "$f" ]] && echo "mincpu:${f}:$(cat $f)"
        done
    } > "${ORIG_STATE}"
    log "系统原始状态已保存"
}

restore_orig_state() {
    [[ ! -f "${ORIG_STATE}" ]] && return
    while IFS=: read -r type path val; do
        [[ -z "$type" ]] && continue
        case "$type" in
            sched|gov)
                echo "$val" > "$path" 2>/dev/null
                ;;
            readahead)
                echo "$val" > "$path" 2>/dev/null
                ;;
            mincpu)
                chmod a+w "$path" 2>/dev/null
                echo "$val" > "$path" 2>/dev/null
                chmod a-w "$path" 2>/dev/null
                ;;
        esac
    done < "${ORIG_STATE}"
    log "已恢复系统原始状态"
}

restore_to_orig() {
    [[ ! -f "${ORIG_STATE}" ]] && return
    while IFS=: read -r type path val; do
        [[ -z "$type" ]] && continue
        case "$type" in
            sched|gov|readahead)
                echo "$val" > "$path" 2>/dev/null
                ;;
        esac
    done < "${ORIG_STATE}"
}

restore_perf() {
    read_settings
    if [[ "${PERF_DEF}" == "1" ]]; then
        local s=$(get_def_perf "sched")
        local r=$(get_def_perf "readahead")
        local g=$(get_def_perf "gov")
        [[ -n "$s" ]] && apply_sched "$s"
        [[ -n "$r" ]] && [[ "$r" -gt 0 ]] 2>/dev/null && apply_readahead "$r"
        [[ -n "$g" ]] && apply_gov "$g"
    else
        restore_to_orig
    fi
}

update_devinfo() {
    local cpuinfo="${MODDIR}/cpu_info.conf"
    [[ ! -f "${cpuinfo}" ]] && return
    sed -i "s/^kernel_ver=.*/kernel_ver=$(uname -r)/" "${cpuinfo}"
}

lock() {
    local i=0
    while ! mkdir "${LOCKDIR}" 2>/dev/null; do
        i=$((i + 1))
        if [[ "${i}" -ge 50 ]]; then
            rmdir "${LOCKDIR}" 2>/dev/null
            mkdir "${LOCKDIR}" 2>/dev/null
            break
        fi
        sleep 0.1 2>/dev/null || sleep 1
    done
}

unlock() {
    rmdir "${LOCKDIR}" 2>/dev/null
}

get_oiface() {
    cat "${OIFACE_STATE}" 2>/dev/null || echo "on"
}

set_oiface() {
    local state="$1" reason="$2"
    lock
    local cur=$(cat "${OIFACE_STATE}" 2>/dev/null || echo "on")
    if [[ "${cur}" != "${state}" ]]; then
        [[ "${state}" == "off" ]] && stop oiface 2>/dev/null || start oiface 2>/dev/null
        echo "${state}" > "${OIFACE_STATE}"
        log "[OiFace] ${cur} → ${state} (${reason})"
    fi
    unlock
}

read_settings() {
    ENABLED=1
    OIFACE_OFF=0
    OIFACE_SMART=0
    OIFACE_INT=3
    PERF_DEF=0
    PERF_APP=0
    if [[ -f "${SETTINGS}" ]]; then
        ENABLED=$(grep "^enabled=" "${SETTINGS}" | cut -d= -f2)
        OIFACE_OFF=$(grep "^oiface_disabled=" "${SETTINGS}" | cut -d= -f2)
        OIFACE_SMART=$(grep "^oiface_smart=" "${SETTINGS}" | cut -d= -f2)
        OIFACE_INT=$(grep "^oiface_interval=" "${SETTINGS}" | cut -d= -f2)
        PERF_DEF=$(grep "^perf_default_enabled=" "${SETTINGS}" | cut -d= -f2)
        PERF_APP=$(grep "^perf_app_enabled=" "${SETTINGS}" | cut -d= -f2)
    fi
    [[ -z "${ENABLED}" ]] && ENABLED=1
    [[ -z "${OIFACE_OFF}" ]] && OIFACE_OFF=0
    [[ -z "${OIFACE_SMART}" ]] && OIFACE_SMART=0
    [[ -z "${OIFACE_INT}" ]] && OIFACE_INT=3
    [[ -z "${PERF_DEF}" ]] && PERF_DEF=0
    [[ -z "${PERF_APP}" ]] && PERF_APP=0
}

get_json_num() {
    local file="$1" key="$2"
    grep -o "\"${key}\"[[:space:]]*:[[:space:]]*[0-9]*" "$file" 2>/dev/null | \
        grep -o '[0-9]*$' | head -n 1
}

get_rule_pkgs() {
    [[ -f "${APPLIST}" ]] && grep -v "^#" "${APPLIST}" | grep -v "^$" | sed 's/[{:=].*//g' | sort -u
}

get_fg_pkg() {
    dumpsys activity activities 2>/dev/null | grep topResumedActivity= | tail -n 1 | cut -d '{' -f2 | cut -d '/' -f1 | cut -d ' ' -f3
}

in_rules() {
    local pkg="$1"
    get_rule_pkgs | grep -q "^${pkg}$"
}

apply_sched() {
    local val="$1"
    [[ -z "$val" ]] && return
    for f in /sys/block/*/queue/scheduler; do
        echo "$val" > "$f" 2>/dev/null
    done
}

apply_readahead() {
    local val="$1"
    [[ -z "$val" ]] && return
    [[ "$val" -gt 0 ]] 2>/dev/null || return
    for f in /sys/block/*/queue/read_ahead_kb; do
        echo "$val" > "$f" 2>/dev/null
    done
}

apply_gov() {
    local val="$1"
    [[ -z "$val" ]] && return
    for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
        echo "$val" > "$f" 2>/dev/null
    done
}

apply_io_cfg() {
    local iocfg="${CFGDIR}/io_scheduler.conf"
    [[ ! -f "${iocfg}" ]] && return
    local sched=$(grep "^scheduler=" "${iocfg}" | cut -d'=' -f2)
    local ra=$(grep "^readahead=" "${iocfg}" | cut -d'=' -f2)
    [[ -n "${sched}" ]] && apply_sched "${sched}" && log "IO调度器: ${sched}"
    [[ -n "${ra}" ]] && apply_readahead "${ra}" && log "预读取: ${ra}KB"
}

apply_prio() {
    local proc="$1" nice="$2" ioc="$3" iol="$4"
    local pids=$(pgrep -f "${proc}" 2>/dev/null)
    [[ -z "${pids}" ]] && return
    for pid in ${pids}; do
        renice -n "${nice}" -p "${pid}" 2>/dev/null
        ionice -c "${ioc}" -n "${iol}" -p "${pid}" 2>/dev/null
    done
}

apply_proc_prio() {
    [[ ! -f "${APPLIST}" ]] && return
    local pkg="" nice="" ioc="" iol=""
    while IFS= read -r line; do
        if echo "${line}" | grep -q "^# @priority:"; then
            local pstr=$(echo "${line}" | sed 's/^# @priority://')
            nice=$(echo "${pstr}" | grep -o 'nice=[^,]*' | cut -d'=' -f2)
            local io=$(echo "${pstr}" | grep -o 'io=[^,]*' | cut -d'=' -f2)
            ioc=$(echo "${io}" | cut -d'-' -f1)
            iol=$(echo "${io}" | cut -d'-' -f2)
            continue
        fi
        echo "${line}" | grep -q "^#\|^$" && continue
        local p=$(echo "${line}" | cut -d'=' -f1 | cut -d'{' -f1 | cut -d':' -f1)
        if [[ -n "${pkg}" ]] && [[ "${p}" != "${pkg}" ]]; then
            [[ -n "${nice}" ]] && apply_prio "${pkg}" "${nice}" "${ioc}" "${iol}"
            nice="" ioc="" iol=""
        fi
        pkg="${p}"
    done < "${APPLIST}"
    [[ -n "${pkg}" ]] && [[ -n "${nice}" ]] && apply_prio "${pkg}" "${nice}" "${ioc}" "${iol}"
}

prio_daemon() {
    while true; do
        sleep 300
        apply_proc_prio
    done
}

get_perf_int() {
    if [[ -f "${PERFCFG}" ]]; then
        local v=$(get_json_num "${PERFCFG}" "interval")
        [[ -n "$v" ]] && [[ "$v" -gt 0 ]] 2>/dev/null && echo "$v" && return
    fi
    echo "1"
}

extract_block() {
    local file="$1" pkg="$2"
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

get_app_perf() {
    local pkg="$1" key="$2"
    [[ ! -f "${PERFCFG}" ]] && return
    local block=$(extract_block "${PERFCFG}" "${pkg}")
    [[ -z "${block}" ]] && return
    case "${key}" in
        disable_oiface)
            echo "${block}" | grep -q '"disableOiface"[[:space:]]*:[[:space:]]*true' && echo "1" || echo "0"
            ;;
        sched)
            echo "${block}" | grep -o '"scheduler"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
            ;;
        readahead)
            echo "${block}" | grep -o '"readahead"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$'
            ;;
        gov)
            echo "${block}" | grep -o '"governor"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
            ;;
    esac
}

has_app_perf() {
    local pkg="$1"
    [[ -f "${PERFCFG}" ]] && grep -q "\"${pkg}\"[[:space:]]*:" "${PERFCFG}"
}

get_def_perf() {
    local key="$1"
    [[ ! -f "${PERFCFG}" ]] && return
    local block=$(extract_block "${PERFCFG}" "default")
    [[ -z "${block}" ]] && return
    case "${key}" in
        sched)
            echo "${block}" | grep -o '"scheduler"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
            ;;
        readahead)
            echo "${block}" | grep -o '"readahead"[[:space:]]*:[[:space:]]*[0-9]*' | grep -o '[0-9]*$'
            ;;
        gov)
            echo "${block}" | grep -o '"governor"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*:[ ]*"\([^"]*\)".*/\1/'
            ;;
    esac
}

apply_def_perf() {
    read_settings
    [[ "${PERF_DEF}" != "1" ]] && return
    local s=$(get_def_perf "sched")
    local r=$(get_def_perf "readahead")
    local g=$(get_def_perf "gov")
    [[ -n "$s" ]] && apply_sched "$s"
    [[ -n "$r" ]] && [[ "$r" -gt 0 ]] 2>/dev/null && apply_readahead "$r"
    [[ -n "$g" ]] && apply_gov "$g"
}

perf_daemon() {
    local LAST_PKG="" LAST_OIFACE=""
    while true; do
        sleep "$(get_perf_int)"
        read_settings
        if [[ "${PERF_APP}" != "1" ]]; then
            if [[ -n "${LAST_PKG}" ]]; then
                restore_perf
                [[ "${LAST_OIFACE}" == "1" ]] && [[ "${OIFACE_SMART}" != "1" ]] && [[ "${OIFACE_OFF}" != "1" ]] && set_oiface "on" "性能配置:关闭"
                LAST_PKG=""
                LAST_OIFACE=""
                log "[性能配置] 功能关闭,已恢复原始状态"
            fi
            continue
        fi
        local fg=$(get_fg_pkg)
        [[ -z "${fg}" ]] && continue
        if [[ "${fg}" != "${LAST_PKG}" ]]; then
            if has_app_perf "${fg}"; then
                local s=$(get_app_perf "${fg}" "sched")
                local r=$(get_app_perf "${fg}" "readahead")
                local g=$(get_app_perf "${fg}" "gov")
                local d=$(get_app_perf "${fg}" "disable_oiface")
                [[ -n "$s" ]] && apply_sched "$s"
                [[ -n "$r" ]] && [[ "$r" -gt 0 ]] 2>/dev/null && apply_readahead "$r"
                [[ -n "$g" ]] && apply_gov "$g"
                if [[ "$d" == "1" ]] && [[ "${OIFACE_OFF}" != "1" ]]; then
                    set_oiface "off" "性能配置:${fg}"
                fi
                LAST_OIFACE="$d"
                log "[性能配置] 已应用: ${fg}"
            else
                if [[ -n "${LAST_PKG}" ]] && has_app_perf "${LAST_PKG}"; then
                    restore_perf
                    [[ "${LAST_OIFACE}" == "1" ]] && [[ "${OIFACE_OFF}" != "1" ]] && set_oiface "on" "性能配置:恢复"
                    LAST_OIFACE=""
                    log "[性能配置] 已恢复原始状态"
                fi
            fi
            LAST_PKG="${fg}"
        fi
    done
}

settings_daemon() {
    local L_EN="${ENABLED}" L_OOFF="${OIFACE_OFF}" L_OSMART="${OIFACE_SMART}" L_PDEF="${PERF_DEF}"
    while true; do
        sleep 2
        read_settings
        if [[ "${ENABLED}" != "${L_EN}" ]]; then
            if [[ "${ENABLED}" == "1" ]]; then
                killall AppOpt 2>/dev/null
                sleep 1
                nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
                log "AppOpt 已启用, PID: $!"
            else
                killall AppOpt 2>/dev/null
                log "AppOpt 已禁用"
            fi
            L_EN="${ENABLED}"
        fi
        if [[ "${ENABLED}" == "1" ]]; then
            pidof AppOpt >/dev/null 2>&1 || {
                nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
                log "AppOpt 重启, PID: $!"
            }
        fi
        if [[ "${OIFACE_OFF}" != "${L_OOFF}" ]]; then
            [[ "${OIFACE_OFF}" == "1" ]] && set_oiface "off" "全局禁用" || set_oiface "on" "全局启用"
            L_OOFF="${OIFACE_OFF}"
        fi
        if [[ "${OIFACE_SMART}" != "${L_OSMART}" ]]; then
            if [[ "${OIFACE_SMART}" == "1" ]]; then
                log "智能OiFace已启用"
            else
                [[ "$(get_oiface)" == "off" ]] && [[ "${OIFACE_OFF}" != "1" ]] && set_oiface "on" "智能模式关闭"
                log "智能OiFace已禁用"
            fi
            L_OSMART="${OIFACE_SMART}"
        fi
        if [[ "${PERF_DEF}" != "${L_PDEF}" ]]; then
            if [[ "${PERF_DEF}" == "1" ]]; then
                apply_def_perf
                log "默认性能配置已启用"
            else
                restore_perf
                log "默认性能配置已禁用,恢复原始状态"
            fi
            L_PDEF="${PERF_DEF}"
        fi
    done
}

smart_oiface_daemon() {
    local cnt=0
    while true; do
        sleep 1
        read_settings
        if [[ "${OIFACE_SMART}" == "1" ]] && [[ "${OIFACE_OFF}" != "1" ]] && [[ "${PERF_APP}" != "1" ]]; then
            cnt=$((cnt + 1))
            if [[ "${cnt}" -ge "${OIFACE_INT}" ]]; then
                cnt=0
                local fg=$(get_fg_pkg)
                if [[ -n "${fg}" ]]; then
                    in_rules "${fg}" && set_oiface "off" "智能:${fg}" || set_oiface "on" "智能:非规则"
                fi
            fi
        else
            cnt=0
        fi
    done
}

wait_boot
cd "${MODDIR}" || exit 1

mkdir -p "${CFGDIR}"
init_runtime
save_orig_state
update_devinfo

echo "" > "${LOG}"
log "星核线程服务启动"

read_settings

apply_io_cfg
log "IO配置已应用"

apply_proc_prio
log "进程优先级已应用"

prio_daemon &
log "优先级守护已启动"

if [[ "${ENABLED}" == "1" ]] && [[ -f "${MODDIR}/AppOpt" ]]; then
    chmod +x "${MODDIR}/AppOpt"
    nohup "${MODDIR}/AppOpt" >/dev/null 2>&1 &
    log "AppOpt 已启动, PID: $!"
else
    log "AppOpt 未启动 (enabled=${ENABLED})"
fi

log "正在解锁CPU核心..."
for f in /sys/devices/system/cpu/cpu*/core_ctl/max_cpus; do
    [[ ! -e "$f" ]] && continue
    maxv=$(cat "$f")
    minf="${f%/*}/min_cpus"
    [[ "$(cat "$minf")" == "$maxv" ]] && continue
    chmod a+w "$minf"
    echo "$maxv" > "$minf"
    chmod a-w "$minf"
done
log "CPU核心解锁完成"

[[ "${OIFACE_OFF}" == "1" ]] && set_oiface "off" "启动时全局禁用"

settings_daemon &
log "设置监控已启动"

smart_oiface_daemon &
log "智能OiFace已启动"

perf_daemon &
log "性能配置守护已启动"

log "服务初始化完成"
