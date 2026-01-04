#!/system/bin/sh
MODDIR="${0%/*}"
ORIG_STATE="${MODDIR}/runtime/original_state.conf"

pkill -f "AppOpt" 2>/dev/null

start oiface 2>/dev/null

if [[ -f "${ORIG_STATE}" ]]; then
    while IFS=: read -r type path val; do
        [[ -z "$type" ]] && continue
        case "$type" in
            sched|gov|readahead)
                echo "$val" > "$path" 2>/dev/null
                ;;
            mincpu)
                chmod a+w "$path" 2>/dev/null
                echo "$val" > "$path" 2>/dev/null
                chmod a-w "$path" 2>/dev/null
                ;;
        esac
    done < "${ORIG_STATE}"
fi

rm -rf /dev/cpuset/AppOpt 2>/dev/null
rm -rf /data/adb/Yuanxing_Stellar_Core_AppOpt_data 2>/dev/null
rm -f /data/local/tmp/stellar_request.json 2>/dev/null
