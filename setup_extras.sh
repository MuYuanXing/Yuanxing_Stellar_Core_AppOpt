#!/system/bin/sh

wait_key() {
    getevent -qt 1 >/dev/null 2>&1
    while true; do
        event=$(getevent -lqc 1 2>/dev/null | {
            while read -r line; do
                case "$line" in
                    *KEY_VOLUMEDOWN*DOWN*) echo "down" && break ;;
                    *KEY_VOLUMEUP*DOWN*) echo "up" && break ;;
                    *KEY_POWER*DOWN*)
                        input keyevent KEY_POWER
                        echo "power" && break ;;
                esac
            done
        })
        [ -n "$event" ] && echo "$event" && return
        usleep 30000
    done
}

ui_print "============================================="
ui_print "- 检测完成，环境安全。"
ui_print "- 可以关注下我的酷安吗喵？🥹🥹🥹"
ui_print "  (作者: 穆远星 / ID: 28719807)"
ui_print " "
ui_print "  [ 音量键上 (+) ] : 好的喵 (关注并安装) 🥰"
ui_print "  [ 音量键下 (-) ] : 不要喵 (直接安装) 😤"
ui_print "============================================="

JUMP_HOME="false"
key=$(wait_key)

if [ "$key" = "up" ]; then
    JUMP_HOME="true"
    ui_print "- 感谢支持！"
else
    ui_print "- 跳过关注"
fi

sleep 1

DESCRIPTION="为${MARKET_NAME}(${DEVICE_MODEL})提供线程CPU亲和性置放。处理器: ${SOC_MODEL}，CPU拓扑: ${CPU_SUMMARY}。"
DESCRIPTION_ESCAPED=$(echo "$DESCRIPTION" | sed 's/[\/&]/\\&/g')

if grep -q "^description=" "$MODPATH/module.prop"; then
    sed -i "s/^description=.*/description=${DESCRIPTION_ESCAPED}/" "$MODPATH/module.prop"
else
    echo "description=${DESCRIPTION}" >> "$MODPATH/module.prop"
fi

ui_print "- 已更新模块属性文件"

if [ "$JUMP_HOME" = "true" ]; then
    BOOT_COMPLETED=$("$GETPROP" sys.boot_completed)
    if [ "$BOOT_COMPLETED" = "1" ]; then
        sleep 1
        ui_print "- 正在打开酷安..."
        am start -a android.intent.action.VIEW -d "http://www.coolapk.com/u/28719807" >/dev/null 2>&1
    fi
fi

rm -f "$MODPATH/setup_extras.sh"
