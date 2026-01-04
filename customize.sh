#!/system/bin/sh
SKIPUNZIP=1

MODID="Yuanxing_Stellar_Core_AppOpt"
OLD_MODDIR="/data/adb/modules/$MODID"
PERSISTENT_DIR="/data/adb/${MODID}_data"

mkdir -p "$PERSISTENT_DIR"
mkdir -p "$PERSISTENT_DIR/config"

if [ -d "$OLD_MODDIR/config" ]; then
    cp -af "$OLD_MODDIR/config/"* "$PERSISTENT_DIR/config/" 2>/dev/null
fi
if [ -f "$OLD_MODDIR/applist.conf" ] && [ ! -f "$PERSISTENT_DIR/applist.conf" ]; then
    cp -af "$OLD_MODDIR/applist.conf" "$PERSISTENT_DIR/applist.conf" 2>/dev/null
fi
if [ -f "$OLD_MODDIR/settings.conf" ] && [ ! -f "$PERSISTENT_DIR/settings.conf" ]; then
    cp -af "$OLD_MODDIR/settings.conf" "$PERSISTENT_DIR/settings.conf" 2>/dev/null
fi

ui_print "- 解压模块文件..."
unzip -o "$ZIPFILE" -d $MODPATH >&2

rm -rf "$MODPATH/META-INF"
rm -f "$MODPATH/customize.sh"

set_perm_recursive $MODPATH 0 0 0755 0644
set_perm $MODPATH/service.sh 0 0 0755
set_perm $MODPATH/uninstall.sh 0 0 0755
set_perm_recursive $MODPATH/webroot 0 0 0755 0644
set_perm_recursive $MODPATH/bin 0 0 0755 0755

MODULE_NAME=$(grep -E '^name=' "$MODPATH/module.prop" | cut -d'=' -f2-)
MODULE_VERSION=$(grep -E '^version=' "$MODPATH/module.prop" | cut -d'=' -f2-)

if [ "$KSU" = "true" ]; then
    ROOT_IMPL="KernelSU"
    ROOT_VER="$KSU_VER"
else
    ROOT_IMPL="Magisk"
    ROOT_VER="$MAGISK_VER"
fi

ui_print "***********************************************"
ui_print " $MODULE_NAME $MODULE_VERSION"
ui_print " 作者: 酷安@穆远星"
ui_print "***********************************************"

set_perm "$PERSISTENT_DIR" 0 0 0755

mkdir -p "$MODPATH/config"

if [ -n "$(ls -A "$PERSISTENT_DIR/config" 2>/dev/null)" ]; then
    cp -af "$PERSISTENT_DIR/config/"* "$MODPATH/config/" 2>/dev/null
fi

if [ -f "$PERSISTENT_DIR/applist.conf" ]; then
    cp -af "$PERSISTENT_DIR/applist.conf" "$MODPATH/applist.conf"
fi

if [ -f "$PERSISTENT_DIR/settings.conf" ]; then
    cp -af "$PERSISTENT_DIR/settings.conf" "$MODPATH/settings.conf"
else
    cat > "$MODPATH/settings.conf" << 'EOF'
interval=2
enabled=1
oiface_disabled=0
oiface_smart=0
oiface_interval=3
perf_default_enabled=0
perf_app_enabled=0
EOF
fi

set_perm "$MODPATH/applist.conf" 0 0 0644
set_perm "$MODPATH/settings.conf" 0 0 0644

GETPROP="/system/bin/getprop"

DEVICE_MODEL=$("$GETPROP" ro.product.model)
[ -z "$DEVICE_MODEL" ] && DEVICE_MODEL=$("$GETPROP" ro.product.odm.model)

MARKET_NAME=$("$GETPROP" ro.vendor.oplus.market.name)
[ -z "$MARKET_NAME" ] && MARKET_NAME=$("$GETPROP" ro.product.market.name)
[ -z "$MARKET_NAME" ] && MARKET_NAME="$DEVICE_MODEL"

BRAND=$("$GETPROP" ro.product.brand)
[ -z "$BRAND" ] && BRAND=$("$GETPROP" ro.product.system.brand)

SOC_MODEL=$("$GETPROP" ro.soc.model)
[ -z "$SOC_MODEL" ] && SOC_MODEL=$("$GETPROP" ro.board.platform)

ANDROID_VER=$("$GETPROP" ro.build.version.release)
ROM_VERSION=$("$GETPROP" ro.build.display.id)
KERNEL_VER=$(uname -r)

ui_print "- 正在检测设备架构..."

if [ "$ARCH" = "arm64" ]; then
    cp "$MODPATH/bin/arm64-v8a/AppOpt" "$MODPATH/AppOpt"
    rm -rf "$MODPATH/bin/arm64-v8a"
    ui_print "✓ 设备平台: $ARCH"
else
    ui_print " "
    ui_print "✗ 不支持的平台: $ARCH"
    ui_print "============================================="
    abort "安装失败"
fi

[ -f "$MODPATH/AppOpt" ] && chmod a+x "$MODPATH/AppOpt"

if ! "$MODPATH/AppOpt" -v; then
    abort "! 主程序验证失败"
fi

ui_print "- 正在分析CPU架构..."

format_cpu_ranges() {
    [ -z "${1// /}" ] && { cat /sys/devices/system/cpu/present; return; }
    awk -v input="$1" 'BEGIN {
        n = split(input, arr, /[[:space:]]+/)
        j = 0
        for (i = 1; i <= n; i++) {
            if (arr[i] != "" && !seen[arr[i]]++) 
                nums[++j] = arr[i] + 0
        }
        n = j
        if (!n) exit
        for (i = 1; i < n; i++) {
            min = i
            for (j = i + 1; j <= n; j++)
                if (nums[j] < nums[min]) min = j
            if (min != i) {
                t = nums[i]
                nums[i] = nums[min]
                nums[min] = t
            }
        }
        start = last = nums[1]
        for (i = 2; i <= n; i++) {
            if (nums[i] == last + 1) {
                last = nums[i]
                continue
            }
            printf "%s%s", sep, (start == last ? start : start "-" last)
            sep = ","
            start = last = nums[i]
        }
        printf "%s", sep
        printf (start == last ? start : start "-" last)
    }'
}

sorted_groups=$(
    for policy in /sys/devices/system/cpu/cpufreq/policy*; do
        [ -d "$policy" ] || continue
        cpus=$(cat "$policy/related_cpus" 2>/dev/null)
        freq=$(cat "$policy/cpuinfo_max_freq" 2>/dev/null)
        [ -z "$cpus" ] || [ -z "$freq" ] && continue
        echo "$freq:$cpus"
    done | sort -n -t: -k1,1 | awk -F: '
    $1 == prev { cores = cores " " $2; next }
    prev != "" { print prev ":" cores; cores = "" }
    { prev = $1; cores = $2 }
    END { if (prev != "") print prev ":" cores }'
)

eval "$(echo "$sorted_groups" | awk -F: '
BEGIN {
    e_core = ""; p_core = ""; hp_core = ""
    e_core_freq = 0; p_core_freq = 0; hp_core_freq = 0
    total_groups = 0
}
{
    freq_arr[NR] = $1
    cpus_arr[NR] = $2
    total_groups = NR
}
END {
    if (total_groups == 0) {
        print "e_core=\"\"; e_core_freq=0; p_core=\"\"; p_core_freq=0; hp_core=\"\"; hp_core_freq=0; total_groups=0;"
        exit
    }
    e_core = cpus_arr[1]
    e_core_freq = freq_arr[1]
    if (total_groups >= 2) {
        hp_core = cpus_arr[total_groups]
        hp_core_freq = freq_arr[total_groups]
    }
    if (total_groups >= 3) {
        p_core = ""
        p_core_freq = 0
        for (i = 2; i < total_groups; i++) {
            p_core = p_core (p_core == "" ? "" : " ") cpus_arr[i]
            if (freq_arr[i] > p_core_freq) p_core_freq = freq_arr[i]
        }
    }
    printf "e_core=\"%s\"; e_core_freq=%d; ", e_core, e_core_freq
    printf "p_core=\"%s\"; p_core_freq=%d; ", p_core, p_core_freq
    printf "hp_core=\"%s\"; hp_core_freq=%d; ", hp_core, hp_core_freq
    printf "total_groups=%d;", total_groups
}')"

all_core="$(cat /sys/devices/system/cpu/present)"

cores=$(for cpus in /sys/devices/system/cpu/cpufreq/*/related_cpus; do 
    [ -f "$cpus" ] && cat "$cpus" | wc -w
done | paste -sd+)

cat > "$MODPATH/cpu_info.conf" <<EOF
device_model=$DEVICE_MODEL
market_name=$MARKET_NAME
soc_model=$SOC_MODEL
android_ver=$ANDROID_VER
kernel_ver=$KERNEL_VER
all_core=$all_core
e_core=$(format_cpu_ranges "$e_core")
e_core_freq=$e_core_freq
p_core=$(format_cpu_ranges "$p_core")
p_core_freq=$p_core_freq
hp_core=$(format_cpu_ranges "$hp_core")
hp_core_freq=$hp_core_freq
total_groups=$total_groups
core_spec=$cores
EOF

ui_print "---------------------------------------------"
ui_print "【设备信息检测】"
ui_print "• 机型型号: $DEVICE_MODEL"
ui_print "• 机型名称: $MARKET_NAME"
ui_print "• 安卓版本: Android $ANDROID_VER"
ui_print "• 内核版本: $KERNEL_VER"
ui_print "• 系统版本: $ROM_VERSION"
ui_print "• Root方案: $ROOT_IMPL $ROOT_VER"
ui_print "---------------------------------------------"
ui_print "【CPU架构分析】"
ui_print "• 处理器: $SOC_MODEL"
ui_print "• CPU核心数: $(nproc)核, 规格: $cores"
ui_print "• 可用核心: $all_core"
[ -n "$(format_cpu_ranges "$e_core")" ] && ui_print "• 小核: $(format_cpu_ranges "$e_core") (最高$((e_core_freq/1000))MHz)"
[ "$total_groups" -ge 3 ] && [ -n "$(format_cpu_ranges "$p_core")" ] && ui_print "• 中核: $(format_cpu_ranges "$p_core") (最高$((p_core_freq/1000))MHz)"
[ "$total_groups" -ge 2 ] && [ -n "$(format_cpu_ranges "$hp_core")" ] && ui_print "• 大核: $(format_cpu_ranges "$hp_core") (最高$((hp_core_freq/1000))MHz)"
ui_print "---------------------------------------------"

if [ ! -f "$MODPATH/applist.conf" ]; then
    touch "$MODPATH/applist.conf"
fi

E_CORE_RANGE=$(format_cpu_ranges "$e_core")
P_CORE_RANGE=$(format_cpu_ranges "$p_core")
HP_CORE_RANGE=$(format_cpu_ranges "$hp_core")

if [ "$total_groups" -ge 3 ]; then
    CPU_SUMMARY="效率核:$E_CORE_RANGE, 性能核:$P_CORE_RANGE, 超级核:$HP_CORE_RANGE"
elif [ "$total_groups" -ge 2 ]; then
    CPU_SUMMARY="小核:$E_CORE_RANGE, 大核:$HP_CORE_RANGE"
else
    CPU_SUMMARY="${all_core}核心"
fi

export MODPATH MARKET_NAME DEVICE_MODEL SOC_MODEL CPU_SUMMARY GETPROP

SETUP_SCRIPT="$MODPATH/setup_extras.sh"
if [ -f "$SETUP_SCRIPT" ]; then
    chmod 0755 "$SETUP_SCRIPT"
    . "$SETUP_SCRIPT"
fi

ui_print "***********************************************"
ui_print "✅ 安装完成！请重启设备使模块生效"
ui_print "***********************************************"
