function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

class CloudConfigManager {
    constructor(app) {
        this.app = app;
        this.leancloud = {
            appId: 'xHBL8yVjTKlMW8QZdGobxuJY-gzGzoHsz',
            appKey: 'vJLbyWty7FPbRDcXNzeBAcfZ',
            serverURL: 'https://xhbl8yvj.lc-cn-n1-shared.com'
        };
        this.deviceId = null;
        this.deviceSecret = null;
        this.nickname = null;
        this.configsCache = null;
        this.secretFile = '/data/adb/Yuanxing_Stellar_Core_AppOpt_data/device.json';
        this._curlPath = null;
    }

    async loadDeviceSecret() {
        if (this.deviceSecret) return this.deviceSecret;
        try {
            const content = await this.app.exec(`cat ${this.secretFile} 2>/dev/null`);
            if (content && content.trim()) {
                const data = JSON.parse(content);
                this.deviceSecret = data.deviceSecret;
                this.nickname = data.nickname || null;
                return this.deviceSecret;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    async saveDeviceSecret(secret, nickname = null) {
        this.deviceSecret = secret;
        if (nickname) this.nickname = nickname;
        const dir = this.secretFile.substring(0, this.secretFile.lastIndexOf('/'));
        await this.app.exec(`mkdir -p ${dir}`);
        const data = JSON.stringify({ deviceSecret: secret, nickname: this.nickname, savedAt: new Date().toISOString() });
        await this.app.exec(`echo '${data.replace(/'/g, "'\\''")}' > ${this.secretFile}`);
        await this.app.exec(`chmod 600 ${this.secretFile}`);
    }

    async saveNicknameLocal(nickname) {
        this.nickname = nickname;
        const dir = this.secretFile.substring(0, this.secretFile.lastIndexOf('/'));
        await this.app.exec(`mkdir -p ${dir}`);
        const data = JSON.stringify({ deviceSecret: this.deviceSecret, nickname: nickname, savedAt: new Date().toISOString() });
        await this.app.exec(`echo '${data.replace(/'/g, "'\\''")}' > ${this.secretFile}`);
        await this.app.exec(`chmod 600 ${this.secretFile}`);
    }

    getNickname() {
        return this.nickname;
    }

    async ensureRegistered() {
        const deviceId = await this.getDeviceId();
        let secret = await this.loadDeviceSecret();
        if (secret) return { deviceId, deviceSecret: secret, nickname: this.nickname };
        throw new Error('设备未注册');
    }

    async getDeviceInfo() {
        const model = await this.app.exec('getprop ro.product.model');
        const brand = await this.app.exec('getprop ro.product.brand');
        const android = await this.app.exec('getprop ro.build.version.release');
        return { model: model.trim(), brand: brand.trim(), android: android.trim() };
    }

    md5(str) {
        function md5cycle(x, k) {
            var a = x[0], b = x[1], c = x[2], d = x[3];
            a = ff(a, b, c, d, k[0], 7, -680876936); d = ff(d, a, b, c, k[1], 12, -389564586);
            c = ff(c, d, a, b, k[2], 17, 606105819); b = ff(b, c, d, a, k[3], 22, -1044525330);
            a = ff(a, b, c, d, k[4], 7, -176418897); d = ff(d, a, b, c, k[5], 12, 1200080426);
            c = ff(c, d, a, b, k[6], 17, -1473231341); b = ff(b, c, d, a, k[7], 22, -45705983);
            a = ff(a, b, c, d, k[8], 7, 1770035416); d = ff(d, a, b, c, k[9], 12, -1958414417);
            c = ff(c, d, a, b, k[10], 17, -42063); b = ff(b, c, d, a, k[11], 22, -1990404162);
            a = ff(a, b, c, d, k[12], 7, 1804603682); d = ff(d, a, b, c, k[13], 12, -40341101);
            c = ff(c, d, a, b, k[14], 17, -1502002290); b = ff(b, c, d, a, k[15], 22, 1236535329);
            a = gg(a, b, c, d, k[1], 5, -165796510); d = gg(d, a, b, c, k[6], 9, -1069501632);
            c = gg(c, d, a, b, k[11], 14, 643717713); b = gg(b, c, d, a, k[0], 20, -373897302);
            a = gg(a, b, c, d, k[5], 5, -701558691); d = gg(d, a, b, c, k[10], 9, 38016083);
            c = gg(c, d, a, b, k[15], 14, -660478335); b = gg(b, c, d, a, k[4], 20, -405537848);
            a = gg(a, b, c, d, k[9], 5, 568446438); d = gg(d, a, b, c, k[14], 9, -1019803690);
            c = gg(c, d, a, b, k[3], 14, -187363961); b = gg(b, c, d, a, k[8], 20, 1163531501);
            a = gg(a, b, c, d, k[13], 5, -1444681467); d = gg(d, a, b, c, k[2], 9, -51403784);
            c = gg(c, d, a, b, k[7], 14, 1735328473); b = gg(b, c, d, a, k[12], 20, -1926607734);
            a = hh(a, b, c, d, k[5], 4, -378558); d = hh(d, a, b, c, k[8], 11, -2022574463);
            c = hh(c, d, a, b, k[11], 16, 1839030562); b = hh(b, c, d, a, k[14], 23, -35309556);
            a = hh(a, b, c, d, k[1], 4, -1530992060); d = hh(d, a, b, c, k[4], 11, 1272893353);
            c = hh(c, d, a, b, k[7], 16, -155497632); b = hh(b, c, d, a, k[10], 23, -1094730640);
            a = hh(a, b, c, d, k[13], 4, 681279174); d = hh(d, a, b, c, k[0], 11, -358537222);
            c = hh(c, d, a, b, k[3], 16, -722521979); b = hh(b, c, d, a, k[6], 23, 76029189);
            a = hh(a, b, c, d, k[9], 4, -640364487); d = hh(d, a, b, c, k[12], 11, -421815835);
            c = hh(c, d, a, b, k[15], 16, 530742520); b = hh(b, c, d, a, k[2], 23, -995338651);
            a = ii(a, b, c, d, k[0], 6, -198630844); d = ii(d, a, b, c, k[7], 10, 1126891415);
            c = ii(c, d, a, b, k[14], 15, -1416354905); b = ii(b, c, d, a, k[5], 21, -57434055);
            a = ii(a, b, c, d, k[12], 6, 1700485571); d = ii(d, a, b, c, k[3], 10, -1894986606);
            c = ii(c, d, a, b, k[10], 15, -1051523); b = ii(b, c, d, a, k[1], 21, -2054922799);
            a = ii(a, b, c, d, k[8], 6, 1873313359); d = ii(d, a, b, c, k[15], 10, -30611744);
            c = ii(c, d, a, b, k[6], 15, -1560198380); b = ii(b, c, d, a, k[13], 21, 1309151649);
            a = ii(a, b, c, d, k[4], 6, -145523070); d = ii(d, a, b, c, k[11], 10, -1120210379);
            c = ii(c, d, a, b, k[2], 15, 718787259); b = ii(b, c, d, a, k[9], 21, -343485551);
            x[0] = add32(a, x[0]); x[1] = add32(b, x[1]); x[2] = add32(c, x[2]); x[3] = add32(d, x[3]);
        }
        function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
        function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
        function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
        function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
        function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
        function md5blk(s) { var md5blks = [], i; for (i = 0; i < 64; i += 4) { md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24); } return md5blks; }
        function md51(s) {
            var n = s.length, state = [1732584193, -271733879, -1732584194, 271733878], i, length, tail, tmp, lo, hi;
            for (i = 64; i <= n; i += 64) { md5cycle(state, md5blk(s.substring(i - 64, i))); }
            s = s.substring(i - 64); length = s.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i++) { tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3); }
            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) { md5cycle(state, tail); for (i = 0; i < 16; i++) tail[i] = 0; }
            tmp = n * 8; tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16); hi = parseInt(tmp[1], 16) || 0;
            tail[14] = lo; tail[15] = hi; md5cycle(state, tail); return state;
        }
        function rhex(n) { var s = '', j; for (j = 0; j < 4; j++) { s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F]; } return s; }
        function hex(x) { for (var i = 0; i < x.length; i++) { x[i] = rhex(x[i]); } return x.join(''); }
        var hex_chr = '0123456789abcdef'.split('');
        function add32(a, b) { return (a + b) & 0xFFFFFFFF; }
        return hex(md51(str));
    }

    sha256(message) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = message[lengthProperty] * 8;
        var hash = [];
        var k = [];
        var primeCounter = 0;
        var isComposite = {};
        for (var candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        message += '\x80';
        while (message[lengthProperty] % 64 - 56) message += '\x00';
        for (i = 0; i < message[lengthProperty]; i++) {
            j = message.charCodeAt(i);
            if (j >> 8) return;
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength);
        for (j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16);
            var oldHash = hash;
            hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2];
                var a = hash[0], e = hash[4];
                var temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6]))
                    + k[i]
                    + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j + 1; j--) {
                var b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? 0 : '') + b.toString(16);
            }
        }
        return result;
    }

    hmacSha256(message, key) {
        var blockSize = 64;
        var oKeyPad = [];
        var iKeyPad = [];
        if (key.length > blockSize) {
            key = this.sha256(key);
        }
        for (var i = 0; i < blockSize; i++) {
            var keyByte = key.charCodeAt(i) || 0;
            oKeyPad[i] = String.fromCharCode(0x5c ^ keyByte);
            iKeyPad[i] = String.fromCharCode(0x36 ^ keyByte);
        }
        var innerHash = this.sha256(iKeyPad.join('') + message);
        var innerHashBytes = '';
        for (var i = 0; i < innerHash.length; i += 2) {
            innerHashBytes += String.fromCharCode(parseInt(innerHash.substr(i, 2), 16));
        }
        return this.sha256(oKeyPad.join('') + innerHashBytes);
    }

    generateSign(deviceId, timestamp, deviceSecret) {
        return this.hmacSha256(deviceId + timestamp, deviceSecret);
    }

    async getDeviceId() {
        if (this.deviceId) return this.deviceId;
        try {
            this.deviceId = await this.app.exec('/system/bin/settings get secure android_id');
            this.deviceId = this.deviceId.trim();
        } catch (e) {
            this.deviceId = 'unknown_' + Date.now();
        }
        return this.deviceId;
    }

    async findCurl() {
        if (this._curlPath) return this._curlPath;
        const paths = [
            `${this.app.modDir}/bin/curl`,
            '/system/bin/curl',
            '/vendor/bin/curl',
            '/system/xbin/curl',
            '/data/adb/magisk/busybox curl',
            '/data/adb/ksu/bin/busybox curl',
            '/data/adb/ap/bin/busybox curl'
        ];
        for (const p of paths) {
            try {
                const test = await this.app.exec(`${p} --version 2>/dev/null | head -n1`);
                if (test && test.toLowerCase().includes('curl')) {
                    this._curlPath = p;
                    return p;
                }
            } catch (e) {}
        }
        return null;
    }

    async callCloudFunction(functionName, params) {
        const url = `${this.leancloud.serverURL}/1.1/functions/${functionName}`;
        try {
            const curlPath = await this.findCurl();
            if (!curlPath) {
                return { success: false, message: '系统缺少curl，请安装BusyBox模块' };
            }
            const jsonStr = JSON.stringify(params);
            const tempFile = '/data/local/tmp/stellar_request.json';
            await this.app.exec(`printf '%s' '${jsonStr.replace(/'/g, "'\\''")}' > ${tempFile}`);
            const cmd = `${curlPath} -s --connect-timeout 15 -X POST -H "X-LC-Id: ${this.leancloud.appId}" -H "X-LC-Key: ${this.leancloud.appKey}" -H "Content-Type: application/json" -d @${tempFile} "${url}" 2>&1`;
            const result = await this.app.exec(cmd);
            await this.app.exec(`rm -f ${tempFile}`);
            if (!result || result.trim() === '') {
                return { success: false, message: '服务器无响应，请检查网络连接' };
            }
            if (result.trim().startsWith('<') || result.trim().startsWith('<!')) {
                return { success: false, message: '服务器返回错误页面，请稍后重试' };
            }
            if (result.includes('curl:') || result.includes('Could not resolve')) {
                return { success: false, message: `网络请求失败: ${result.substring(0, 100)}` };
            }
            const parsed = JSON.parse(result);
            if (parsed.result) return parsed.result;
            if (parsed.error) return { success: false, message: parsed.error };
            return parsed;
        } catch (e) {
            if (e.message && e.message.includes('JSON')) {
                return { success: false, message: '服务器响应格式异常，请联系管理员' };
            }
            return { success: false, message: `请求异常: ${e.message || '未知错误'}` };
        }
    }

    async fetchConfigs(forceRefresh = false) {
        if (this.configsCache && !forceRefresh) return this.configsCache;
        const result = await this.callCloudFunction('getConfigs', {});
        if (result && Array.isArray(result)) {
            this.configsCache = result;
            return this.configsCache;
        }
        return [];
    }

    async fetchConfigDetail(objectId) {
        const result = await this.callCloudFunction('getConfigDetail', { objectId });
        if (result && result.objectId) return result;
        return null;
    }

    async downloadConfig(objectId) {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return null;
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('downloadConfig', { objectId, deviceId, timestamp, sign });
        if (result && result.success && result.content) {
            this.configsCache = null;
            return result.content;
        }
        return null;
    }

    async getDisplayConfigs(category = 'all', searchTerm = '', sortBy = 'downloads') {
        let configs = await this.fetchConfigs();
        if (category !== 'all') configs = configs.filter(c => c.category === category);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            configs = configs.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.description && c.description.toLowerCase().includes(term)) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(term))) ||
                (c.processors && c.processors.some(p => p.toLowerCase().includes(term)))
            );
        }
        configs.sort((a, b) => {
            const weightA = a.sortWeight || 0;
            const weightB = b.sortWeight || 0;
            if (weightA !== weightB) return weightB - weightA;
            if (sortBy === 'downloads') return (b.downloads || 0) - (a.downloads || 0);
            if (sortBy === 'rating') {
                const ratingA = a.ratingCount > 0 ? a.ratingSum / a.ratingCount : 0;
                const ratingB = b.ratingCount > 0 ? b.ratingSum / b.ratingCount : 0;
                return ratingB - ratingA;
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        const spotlight = [], picks = [], normal = [];
        configs.forEach(config => {
            if (config.isFeatured && config.isOfficial) {
                config.badge = '推荐';
                spotlight.push(config);
            } else if (config.isFeatured) {
                config.badge = '精选';
                picks.push(config);
            } else {
                normal.push(config);
            }
        });
        return { spotlight, picks, normal };
    }

    async uploadConfig(name, description, category, tags, content, authorName, version, processors, baseConfigs = []) {
        try {
            const { deviceId, deviceSecret } = await this.ensureRegistered();
            const timestamp = Date.now();
            const sign = this.generateSign(deviceId, timestamp, deviceSecret);
            let versionStr = String(version).replace(/。/g, '.').replace(/[^\d.]/g, '');
            const versionNum = parseFloat(versionStr) || 1;
            const result = await this.callCloudFunction('uploadConfig', {
                deviceId, timestamp, sign,
                name, description, category,
                tags: tags.split(/\s+/).filter(t => t),
                processors: processors.split(/\s+/).filter(p => p),
                author: authorName, content, version: versionNum,
                baseConfigs: baseConfigs
            });
            if (result && result.success) {
                this.configsCache = null;
                return { success: true, message: result.message || '上传成功！' };
            }
            return { success: false, message: result?.message || '上传失败' };
        } catch (e) {
            return { success: false, message: `上传异常: ${e.message || '未知错误'}` };
        }
    }

    async isConfigAuthor(objectId) {
        const deviceId = await this.getDeviceId();
        const config = await this.fetchConfigDetail(objectId);
        return config && config.authorDeviceId === deviceId;
    }

    async updateConfigDirect(objectId, updateData, changeLog) {
        try {
            const { deviceId, deviceSecret } = await this.ensureRegistered();
            const timestamp = Date.now();
            const sign = this.generateSign(deviceId, timestamp, deviceSecret);
            const result = await this.callCloudFunction('updateConfig', {
                deviceId, timestamp, sign, objectId,
                name: updateData.name,
                description: updateData.description,
                category: updateData.category,
                content: updateData.content,
                version: updateData.version,
                tags: updateData.tags,
                processors: updateData.processors,
                changeLog
            });
            if (result && result.success) {
                this.configsCache = null;
                return { success: true, message: '配置已更新！' };
            }
            if (result?.message?.includes('无权')) return { success: false, message: '只能修改自己上传的配置' };
            return { success: false, message: result?.message || '更新失败' };
        } catch (e) {
            return { success: false, message: e.message || '更新失败' };
        }
    }

    async deleteConfig(objectId) {
        try {
            const { deviceId, deviceSecret } = await this.ensureRegistered();
            const timestamp = Date.now();
            const sign = this.generateSign(deviceId, timestamp, deviceSecret);
            const result = await this.callCloudFunction('deleteConfig', { deviceId, timestamp, sign, objectId });
            if (result && result.success) {
                this.configsCache = null;
                return { success: true, message: '配置已删除' };
            }
            if (result?.message?.includes('无权')) return { success: false, message: '无权删除(deviceId不匹配)' };
            if (result?.message?.includes('不存在')) return { success: false, message: '配置不存在(已被删除?)' };
            return { success: false, message: `失败: ${result?.message || result?.error || JSON.stringify(result)}` };
        } catch (e) {
            return { success: false, message: e.message || '删除失败' };
        }
    }

    async rateConfig(objectId, rating, comment = '') {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return { success: false, message: '设备未注册' };
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('rateConfig', { deviceId, timestamp, sign, objectId, rating, comment: comment || '' });
        this.configsCache = null;
        if (result && result.success) return result;
        return { success: false, message: result?.message || '评分失败' };
    }

    async getUserRating(objectId) {
        const deviceId = await this.getDeviceId();
        const result = await this.callCloudFunction('getUserRating', { objectId, deviceId });
        if (result && result.rating !== undefined) return result.rating;
        return null;
    }

    async getMyConfigs() {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return [];
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('getMyConfigs', { deviceId, timestamp, sign });
        if (result && Array.isArray(result)) return result;
        return [];
    }

    async checkDeviceStatus() {
        const secret = await this.loadDeviceSecret();
        if (secret) {
            const deviceId = await this.getDeviceId();
            const timestamp = Date.now();
            const sign = this.generateSign(deviceId, timestamp, secret);
            const profile = await this.callCloudFunction('getDeviceProfile', { deviceId, timestamp, sign });
            if (profile && profile.success) {
                if (profile.nickname && !this.nickname) {
                    await this.saveNicknameLocal(profile.nickname);
                }
                return {
                    status: 'registered',
                    hasNickname: profile.hasNickname,
                    hasPassword: profile.hasPassword,
                    nickname: profile.nickname,
                    createdAt: profile.createdAt
                };
            }
            return { status: 'registered', hasNickname: !!this.nickname, hasPassword: false, nickname: this.nickname };
        }
        return { status: 'new' };
    }

    async checkNickname(nickname) {
        const result = await this.callCloudFunction('checkNickname', { nickname });
        return result;
    }

    async setNickname(nickname) {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return { success: false, message: '设备未注册' };
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('setNickname', { deviceId, timestamp, sign, nickname });
        if (result && result.success) {
            await this.saveNicknameLocal(result.nickname);
            return { success: true, nickname: result.nickname };
        }
        return { success: false, message: result?.message || '设置失败' };
    }

    async getDeviceProfile() {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return { success: false, message: '设备未注册' };
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('getDeviceProfile', { deviceId, timestamp, sign });
        return result;
    }

    async verifyPasswordForRecovery(password) {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return { success: false, message: '设备未注册' };
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('verifyPasswordForRecovery', { deviceId, timestamp, sign, password });
        return result;
    }

    async verifyAuthCode(authCode) {
        const deviceId = await this.getDeviceId();
        const secret = await this.loadDeviceSecret();
        if (!secret) return { success: false, message: '设备未注册' };
        const timestamp = Date.now();
        const sign = this.generateSign(deviceId, timestamp, secret);
        const result = await this.callCloudFunction('setAuthCode', { deviceId, timestamp, sign, authCode });
        return result;
    }

    async registerWithPassword(nickname, password) {
        const deviceId = await this.getDeviceId();
        const deviceInfo = await this.getDeviceInfo();
        const result = await this.callCloudFunction('registerDevice', { deviceId, deviceInfo, nickname, password });
        if (result && result.success && result.deviceSecret) {
            await this.saveDeviceSecret(result.deviceSecret, result.nickname);
            return { success: true, recoveryCode: result.recoveryCode, isNew: result.isNew, hasNickname: result.hasNickname, hasPassword: result.hasPassword, nickname: result.nickname };
        }
        return { success: false, message: result?.message || '注册失败' };
    }

    async recoverDevice(credential) {
        const deviceId = await this.getDeviceId();
        const deviceInfo = await this.getDeviceInfo();
        const result = await this.callCloudFunction('recoverDevice', { newDeviceId: deviceId, newDeviceInfo: deviceInfo, credential });
        if (result && result.success && result.deviceSecret) {
            await this.saveDeviceSecret(result.deviceSecret, result.nickname);
            return { success: true, recoveryCode: result.recoveryCode, nickname: result.nickname, hasNickname: result.hasNickname };
        }
        return { success: false, message: result?.message || '找回失败' };
    }
}

class StellarCoreAppOpt {
    constructor() {
        this.modDir = '/data/adb/modules/Yuanxing_Stellar_Core_AppOpt';
        this.persistentDir = '/data/adb/Yuanxing_Stellar_Core_AppOpt_data';
        this.configFile = `${this.modDir}/applist.conf`;
        this.settingsFile = `${this.modDir}/settings.conf`;
        this.cpuInfoFile = `${this.modDir}/cpu_info.conf`;
        this.logFile = `${this.modDir}/service.log`;
        this.cloudLogFile = `${this.persistentDir}/cloud.log`;
        this.exportPath = '/storage/emulated/0/applist.conf';
        this.cpuInfo = {};
        this.settings = { interval: 2, enabled: 1, oiface_disabled: 0, oiface_smart: 0, oiface_interval: 3, perf_default_enabled: 0, perf_app_enabled: 0 };
        this.cloud = new CloudConfigManager(this);
        this.currentCloudConfig = null;
        this.currentCategory = 'all';
        this.currentSource = 'all';
        this.currentSearchTerm = '';
        this.allCloudConfigs = null;
        this.myConfigsCache = null;
        this.myConfigsSearchTerm = '';
        this.rulesSearchTerm = '';
        this.currentLogFilter = 'all';
        this.pendingConfigContent = null;
        this.pendingConfigApps = [];
        this.selectedApps = new Set();
        this.configDir = `${this.modDir}/config`;
        this.rulesMeta = new RulesMetaManager(this);
        this.init();
    }

    async init() {
        await this.exec(`mkdir -p ${this.configDir}`);
        await this.loadCpuInfo();
        await this.loadSettings();
        await this.rulesMeta.load();
        await this.checkServiceStatus();
        await this.loadLog();
        this.bindEvents();
        await IOSchedulerManager.init(this);
        await PerformanceManager.init(this);
        PriorityManager.init(this);
        ThemeManager.init();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
    }

    async addCloudLog(action, detail) {
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', { hour12: false });
        const logLine = `[${timeStr}] [云端] [${action}] ${detail}`;
        await this.exec(`/system/bin/mkdir -p ${this.persistentDir}`);
        await this.exec(`/system/bin/echo '${logLine.replace(/'/g, "'\\''")}' >> ${this.cloudLogFile}`);
        await this.exec(`/system/bin/tail -n 200 ${this.cloudLogFile} > ${this.cloudLogFile}.tmp && /system/bin/mv ${this.cloudLogFile}.tmp ${this.cloudLogFile}`);
    }

    bindEvents() {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchPage(e.currentTarget.dataset.page));
        });
        document.querySelectorAll('.interval-btn:not([data-target])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delta = parseInt(e.target.dataset.delta);
                this.adjustInterval(delta);
            });
        });
        document.getElementById('oiface-disable-toggle').addEventListener('change', (e) => this.toggleOifaceDisable(e.target.checked));
        document.getElementById('oiface-smart-toggle').addEventListener('change', (e) => this.toggleOifaceSmart(e.target.checked));
        document.getElementById('perf-default-toggle').addEventListener('change', (e) => this.togglePerfDefault(e.target.checked));
        document.getElementById('perf-app-toggle').addEventListener('change', (e) => this.togglePerfApp(e.target.checked));
        document.querySelectorAll('.interval-btn[data-target="oiface"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delta = parseInt(e.target.dataset.delta);
                this.adjustOifaceInterval(delta);
            });
        });
        document.getElementById('log-header-toggle').addEventListener('click', () => this.toggleLogCollapse());
        document.getElementById('add-rule').addEventListener('click', () => this.showRuleModal());
        document.getElementById('rule-cancel').addEventListener('click', () => this.hideRuleModal());
        document.getElementById('rule-done').addEventListener('click', () => this.addRules());
        document.getElementById('edit-cancel').addEventListener('click', () => this.hideEditModal());
        document.getElementById('edit-done').addEventListener('click', () => this.saveEditRules());
        document.getElementById('refresh-log').addEventListener('click', () => this.loadLog());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
        document.getElementById('clear-rules').addEventListener('click', () => this.clearRules());
        document.getElementById('export-config').addEventListener('click', () => this.exportConfig());
        document.getElementById('import-config')?.addEventListener('click', () => this.showImportModal());
        document.getElementById('import-cancel')?.addEventListener('click', () => {
            document.getElementById('import-modal').classList.remove('show');
        });
        document.getElementById('import-confirm')?.addEventListener('click', () => this.doImportConfig());
        document.getElementById('import-conflict-cancel')?.addEventListener('click', () => {
            document.getElementById('import-conflict-modal').classList.remove('show');
        });
        document.getElementById('import-conflict-overwrite')?.addEventListener('click', () => this.applyImportConfig('overwrite'));
        document.getElementById('import-conflict-skip')?.addEventListener('click', () => this.applyImportConfig('skip'));
        document.querySelectorAll('.log-filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('.log-filter-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentLogFilter = e.target.dataset.filter;
                this.loadLog();
            });
        });
        const rulesSearch = document.getElementById('rules-search');
        if (rulesSearch) {
            rulesSearch.addEventListener('input', (e) => {
                this.rulesSearchTerm = e.target.value;
                this.renderRules();
            });
        }
        document.getElementById('coolapk-link').addEventListener('click', () => this.openUrl('http://www.coolapk.com/u/28719807'));
        document.getElementById('qq-link').addEventListener('click', () => {
            this.openUrl('https://qun.qq.com/universal-share/share?ac=1&authKey=cnoGox8bJ%2BF9cGGtNBNmH3ZvIE6u13LkX1wbuM8%2BQRdERAnwfukEX5iJzyHJr8h%2B&busi_data=eyJncm91cENvZGUiOiIxMDYyMzM1ODk1IiwidG9rZW4iOiJDY0xTblprbEtnTWpDRzlnMVdBYVo1MDhpYzRNaEllRUZscnhOTlZHa1RFM2JXcTB0bjQ3WlRZMndxOEFRaFQrIiwidWluIjoiMzg5NDM3NDc0MSJ9&data=_n7BCviDsuBVUksmxi6BMp6VCcJ2PErYQ73Nz-hhTSQWznPeJ6uxmp6NVHO_WFk6mqFw8k8VZBTqhNckrSP0rA&svctype=4&tempid=h5_group_info');
        });
        document.getElementById('link-suto')?.addEventListener('click', () => this.openUrl('http://www.coolapk.com/u/1842370'));
        document.getElementById('donate-wx').addEventListener('click', () => this.showQrModal('pay/wxpay.png'));
        document.getElementById('donate-ali').addEventListener('click', () => this.showQrModal('pay/alipay.png'));
        document.getElementById('qr-modal').addEventListener('click', (e) => {
            if (e.target.id === 'qr-modal') this.hideQrModal();
        });
        document.getElementById('cloud-refresh').addEventListener('click', () => this.loadCloudConfigs(true));
        document.getElementById('cloud-upload').addEventListener('click', async () => await this.showUploadModal());
        document.getElementById('cloud-search').addEventListener('input', (e) => {
            this.currentSearchTerm = e.target.value;
            this.filterAndRenderCloudConfigs();
        });
        document.querySelectorAll('#cloud-source-categories .category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('#cloud-source-categories .category-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSource = e.target.dataset.source;
                this.filterAndRenderCloudConfigs();
            });
        });
        document.querySelectorAll('#cloud-type-categories .category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                document.querySelectorAll('#cloud-type-categories .category-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCategory = e.target.dataset.category;
                this.filterAndRenderCloudConfigs();
            });
        });
        document.getElementById('cloud-detail-cancel').addEventListener('click', () => {
            document.getElementById('cloud-detail-modal').classList.remove('show');
        });
        document.getElementById('cloud-detail-preview').addEventListener('click', () => {
            if (this.currentCloudConfig) this.previewConfig(this.currentCloudConfig.objectId);
        });
        document.getElementById('download-mode-cancel').addEventListener('click', () => {
            document.getElementById('download-mode-modal').classList.remove('show');
        });
        document.querySelectorAll('.download-mode-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                const mode = e.currentTarget.dataset.mode;
                document.getElementById('download-mode-modal').classList.remove('show');
                mode === 'all' ? document.getElementById('apply-mode-modal').classList.add('show') : await this.showSelectAppsModal();
            });
        });
        document.getElementById('apply-mode-cancel').addEventListener('click', () => {
            document.getElementById('apply-mode-modal').classList.remove('show');
        });
        document.querySelectorAll('.apply-mode-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                document.getElementById('apply-mode-modal').classList.remove('show');
                await this.applyCloudConfig(e.currentTarget.dataset.mode);
            });
        });
        document.getElementById('select-apps-cancel').addEventListener('click', () => {
            document.getElementById('select-apps-modal').classList.remove('show');
        });
        document.getElementById('select-apps-done').addEventListener('click', () => {
            document.getElementById('select-apps-modal').classList.remove('show');
            if (this.selectedApps.size > 0) {
                document.getElementById('apply-mode-modal').classList.add('show');
            } else {
                this.showToast('请至少选择一个应用');
            }
        });
        document.getElementById('select-all-apps').addEventListener('click', () => {
            this.pendingConfigApps.forEach(app => this.selectedApps.add(app.package));
            this.renderSelectAppsList();
        });
        document.getElementById('deselect-all-apps').addEventListener('click', () => {
            this.selectedApps.clear();
            this.renderSelectAppsList();
        });
        const selectAppsSearch = document.getElementById('select-apps-search');
        if (selectAppsSearch) selectAppsSearch.addEventListener('input', () => this.renderSelectAppsList());
        document.getElementById('upload-cancel').addEventListener('click', () => {
            document.getElementById('upload-modal').classList.remove('show');
        });
        document.getElementById('upload-done').addEventListener('click', () => this.submitUpload());
        this.bindCategorySelector('upload-category');
        document.getElementById('preview-cancel').addEventListener('click', () => {
            document.getElementById('preview-modal').classList.remove('show');
        });
        document.getElementById('cloud-mine').addEventListener('click', () => this.showMyConfigs());
        document.getElementById('cloud-account')?.addEventListener('click', () => this.showAccountModal());
        document.getElementById('my-configs-cancel').addEventListener('click', () => {
            document.getElementById('my-configs-modal').classList.remove('show');
        });
        document.getElementById('my-configs-refresh').addEventListener('click', () => this.loadMyConfigs(true));
        const myConfigsSearch = document.getElementById('my-configs-search');
        if (myConfigsSearch) {
            myConfigsSearch.addEventListener('input', (e) => {
                this.myConfigsSearchTerm = e.target.value;
                this.filterAndRenderMyConfigs();
            });
        }
        const configUpdateCancel = document.getElementById('config-update-cancel');
        if (configUpdateCancel) configUpdateCancel.addEventListener('click', () => {
            document.getElementById('config-update-modal').classList.remove('show');
        });
        const configUpdateDone = document.getElementById('config-update-done');
        if (configUpdateDone) configUpdateDone.addEventListener('click', () => this.submitConfigUpdateFull());
        this.bindCategorySelector('config-update-category');
        document.getElementById('check-update-btn')?.addEventListener('click', () => checkCloudUpdates(this));
        document.getElementById('check-update-cancel')?.addEventListener('click', () => {
            document.getElementById('check-update-modal').classList.remove('show');
        });
        document.getElementById('check-update-done')?.addEventListener('click', () => this.applyCloudUpdates());
    }

    bindCategorySelector(prefix) {
        const wrapper = document.getElementById(`${prefix}-wrapper`);
        const display = document.getElementById(`${prefix}-display`);
        const options = document.getElementById(`${prefix}-options`);
        if (!display || !options || !wrapper) return;
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('open');
            options.classList.toggle('hidden');
        });
        document.querySelectorAll(`#${prefix}-options .ui-select-option`).forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById(prefix).value = opt.dataset.value;
                document.getElementById(`${prefix}-text`).textContent = opt.textContent;
                document.querySelectorAll(`#${prefix}-options .ui-select-option`).forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                wrapper.classList.remove('open');
                options.classList.add('hidden');
            });
        });
        document.addEventListener('click', (e) => {
            if (wrapper.classList.contains('open') && !wrapper.contains(e.target)) {
                wrapper.classList.remove('open');
                options.classList.add('hidden');
            }
        });
    }

    async exec(cmd) {
        return new Promise((resolve) => {
            const callback = `cb_${Date.now()}_${Math.random().toString(36).substring(2, 2 + 9)}`;
            let timeout = setTimeout(() => {
                delete window[callback];
                resolve('');
            }, 15000);
            window[callback] = (code, stdout, stderr) => {
                clearTimeout(timeout);
                delete window[callback];
                resolve(stdout ? stdout.trim() : '');
            };
            try {
                ksu.exec(cmd, "{}", callback);
            } catch (e) {
                clearTimeout(timeout);
                delete window[callback];
                resolve('');
            }
        });
    }

    async loadCpuInfo() {
        const content = await this.exec(`/system/bin/cat ${this.cpuInfoFile} 2>/dev/null`);
        if (content) {
            content.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value !== undefined) this.cpuInfo[key.trim()] = value.trim();
            });
        }
        if (!this.cpuInfo.device_model) {
            this.cpuInfo.device_model = await this.exec('/system/bin/getprop ro.product.model');
            this.cpuInfo.market_name = await this.exec('/system/bin/getprop ro.product.market.name') || this.cpuInfo.device_model;
            this.cpuInfo.soc_model = await this.exec('/system/bin/getprop ro.soc.model');
            this.cpuInfo.android_ver = await this.exec('/system/bin/getprop ro.build.version.release');
            this.cpuInfo.kernel_ver = await this.exec('/system/bin/uname -r');
            this.cpuInfo.all_core = await this.exec('/system/bin/cat /sys/devices/system/cpu/present');
        }
        this.renderDeviceInfo();
        this.renderCpuInfo();
    }

    renderDeviceInfo() {
        document.getElementById('market-name').textContent = this.cpuInfo.market_name || '未知';
        document.getElementById('device-model').textContent = this.cpuInfo.device_model || '未知';
        document.getElementById('soc-model').textContent = this.cpuInfo.soc_model || '未知';
        document.getElementById('android-ver').textContent = `Android ${this.cpuInfo.android_ver || '未知'}`;
        document.getElementById('kernel-ver').textContent = this.cpuInfo.kernel_ver || '未知';
    }

    renderCpuInfo() {
        document.getElementById('all-cores').textContent = this.cpuInfo.all_core || '未知';
    }

    async loadSettings() {
        const content = await this.exec(`/system/bin/cat ${this.settingsFile} 2>/dev/null`);
        if (content) {
            content.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value !== undefined) this.settings[key.trim()] = parseInt(value.trim()) || value.trim();
            });
        }
        document.getElementById('interval-value').textContent = this.settings.interval;
        document.getElementById('oiface-disable-toggle').checked = this.settings.oiface_disabled === 1;
        document.getElementById('oiface-smart-toggle').checked = this.settings.oiface_smart === 1;
        document.getElementById('oiface-interval-value').textContent = this.settings.oiface_interval;
        document.getElementById('perf-default-toggle').checked = this.settings.perf_default_enabled === 1;
        document.getElementById('perf-app-toggle').checked = this.settings.perf_app_enabled === 1;
        this.updateOifaceUI();
    }

    async saveSettings() {
        const content = `interval=${this.settings.interval}\nenabled=${this.settings.enabled}\noiface_disabled=${this.settings.oiface_disabled}\noiface_smart=${this.settings.oiface_smart}\noiface_interval=${this.settings.oiface_interval}\nperf_default_enabled=${this.settings.perf_default_enabled}\nperf_app_enabled=${this.settings.perf_app_enabled}`;
        await this.exec(`/system/bin/echo '${content}' > ${this.settingsFile}`);
        await this.syncToPersistent();
    }

    async syncToPersistent() {
        await this.exec(`/system/bin/mkdir -p ${this.persistentDir}`);
        await this.exec(`/system/bin/cp -af ${this.configFile} ${this.persistentDir}/applist.conf 2>/dev/null`);
        await this.exec(`/system/bin/cp -af ${this.settingsFile} ${this.persistentDir}/settings.conf 2>/dev/null`);
    }

    async adjustInterval(delta) {
        let newInterval = this.settings.interval + delta;
        if (newInterval < 1) newInterval = 1;
        if (newInterval > 10) newInterval = 10;
        this.settings.interval = newInterval;
        document.getElementById('interval-value').textContent = newInterval;
        await this.saveSettings();
        this.showToast(`检查间隔已设置为 ${newInterval} 秒`);
    }

    async toggleOifaceDisable(disabled) {
        this.settings.oiface_disabled = disabled ? 1 : 0;
        if (disabled) {
            await this.exec('stop oiface');
            this.showToast('OiFace 已禁用');
        } else {
            await this.exec('start oiface');
            this.showToast('OiFace 已启用');
        }
        this.updateOifaceUI();
        await this.saveSettings();
    }

    async toggleOifaceSmart(enabled) {
        this.settings.oiface_smart = enabled ? 1 : 0;
        if (enabled) {
            this.showToast('智能 OiFace 已启用');
        } else {
            this.showToast('智能 OiFace 已禁用');
        }
        this.updateOifaceUI();
        await this.saveSettings();
    }

    async togglePerfDefault(enabled) {
        this.settings.perf_default_enabled = enabled ? 1 : 0;
        await this.saveSettings();
        this.showToast(enabled ? '默认配置已启用' : '默认配置已禁用');
    }

    async togglePerfApp(enabled) {
        this.settings.perf_app_enabled = enabled ? 1 : 0;
        await this.saveSettings();
        this.showToast(enabled ? '应用专属配置已启用' : '应用专属配置已禁用');
    }

    async adjustOifaceInterval(delta) {
        let newInterval = this.settings.oiface_interval + delta;
        if (newInterval < 1) newInterval = 1;
        if (newInterval > 10) newInterval = 10;
        this.settings.oiface_interval = newInterval;
        document.getElementById('oiface-interval-value').textContent = newInterval;
        await this.saveSettings();
        this.showToast(`智能检测间隔已设置为 ${newInterval} 秒`);
    }

    updateOifaceUI() {
        const disableToggle = document.getElementById('oiface-disable-toggle');
        const smartToggle = document.getElementById('oiface-smart-toggle');
        const smartGroup = document.getElementById('oiface-smart-group');
        const intervalGroup = document.getElementById('oiface-interval-group');
        const isDisabled = this.settings.oiface_disabled === 1;
        const isSmart = this.settings.oiface_smart === 1;
        if (isDisabled) {
            smartGroup.classList.add('disabled');
            smartToggle.disabled = true;
            intervalGroup.classList.add('hidden');
        } else {
            smartGroup.classList.remove('disabled');
            smartToggle.disabled = false;
            if (isSmart) {
                intervalGroup.classList.remove('hidden');
            } else {
                intervalGroup.classList.add('hidden');
            }
        }
        if (typeof PerformanceManager !== 'undefined' && PerformanceManager.updateOifaceDisabled) {
            PerformanceManager.updateOifaceDisabled(isSmart && !isDisabled);
        }
    }

    async checkServiceStatus() {
        const result = await this.exec('/system/bin/pidof AppOpt');
        const statusBadge = document.getElementById('service-status');
        if (result) {
            statusBadge.textContent = '运行中';
            statusBadge.className = 'status-badge running';
        } else {
            statusBadge.textContent = '已停止';
            statusBadge.className = 'status-badge stopped';
        }
    }

    toggleLogCollapse() {
        const wrapper = document.getElementById('log-content-wrapper');
        const icon = document.getElementById('log-collapse-icon');
        const hint = document.getElementById('log-expand-hint');
        const card = wrapper.closest('.log-card-collapsible');
        const pageHome = document.getElementById('page-home');
        if (wrapper.classList.contains('collapsed')) {
            wrapper.classList.remove('collapsed');
            card.classList.remove('collapsed');
            pageHome.classList.remove('log-collapsed');
            icon.textContent = '▲';
            hint.textContent = '点击收起';
        } else {
            wrapper.classList.add('collapsed');
            card.classList.add('collapsed');
            pageHome.classList.add('log-collapsed');
            icon.textContent = '▼';
            hint.textContent = '点击展开';
        }
    }
    
    validateCpuRange(cpuStr) {
        if (!this.cpuInfo.all_core) return true;
        let maxCore = 7;
        try {
            const parts = this.cpuInfo.all_core.split('-');
            if (parts.length === 2) maxCore = parseInt(parts[1]);
        } catch (e) { /* ignore */ }
        const numbers = cpuStr.match(/\d+/g);
        if (!numbers) return true;
        for (const numStr of numbers) {
            const num = parseInt(numStr);
            if (num > maxCore) {
                this.showToast(`错误：核心 ${num} 不存在 (设备范围 0-${maxCore})`);
                return false;
            }
        }
        return true;
    }

    parseRuleLine(line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return null;
        const colonIdx = trimmed.indexOf(':');
        const braceIdx = trimmed.indexOf('{');
        if (colonIdx > 0 && (braceIdx === -1 || colonIdx < braceIdx)) {
            const subThreadMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_.]*):([^{=]+)\{([^}]+)\}=(.+)$/);
            if (subThreadMatch) return { package: subThreadMatch[1], subprocess: subThreadMatch[2], thread: subThreadMatch[3], cpus: subThreadMatch[4], type: 'subprocess_thread', raw: trimmed };
            const subprocessMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_.]*):([^=]+)=(.+)$/);
            if (subprocessMatch) return { package: subprocessMatch[1], thread: null, subprocess: subprocessMatch[2], cpus: subprocessMatch[3], type: 'subprocess', raw: trimmed };
        }
        const threadMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_.]*)\{([^}]+)\}=(.+)$/);
        if (threadMatch) return { package: threadMatch[1], thread: threadMatch[2], subprocess: null, cpus: threadMatch[3], type: 'thread', raw: trimmed };
        const mainMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_.]*)=(.+)$/);
        if (mainMatch) return { package: mainMatch[1], thread: null, subprocess: null, cpus: mainMatch[2], type: 'main', raw: trimmed };
        return null;
    }

    renderRules() {
        const container = document.getElementById('rules-container');
        const metaApps = this.rulesMeta?.meta?.apps || {};
        let filteredGroups = Object.keys(metaApps);
        if (this.rulesSearchTerm) {
            const term = this.rulesSearchTerm.toLowerCase();
            filteredGroups = filteredGroups.filter(pkg => {
                const appName = metaApps[pkg]?.appName || '';
                return pkg.toLowerCase().includes(term) || appName.toLowerCase().includes(term);
            });
        }
        if (filteredGroups.length === 0) {
            container.innerHTML = this.rulesSearchTerm
                ? '<div style="text-align:center;padding:40px;color:#8E8E93;">未找到匹配的规则</div>'
                : '<div style="text-align:center;padding:40px;color:#8E8E93;">暂无规则，点击上方"添加"按钮添加规则</div>';
            return;
        }
        container.innerHTML = filteredGroups.map(pkg => {
            const metaApp = metaApps[pkg];
            const rules = metaApp?.rules || [];
            const appName = metaApp?.appName || '';
            const displayName = appName || pkg;
            const showPkg = appName ? pkg : '';
            const priority = metaApp?.priority;
            const priorityText = this.getPriorityText(priority);
            const mainRules = rules.filter(r => r.type === 'main');
            const threadRules = rules.filter(r => r.type === 'thread');
            const subprocessRules = rules.filter(r => r.type === 'subprocess');
            let rulesHtml = '';
            const getRuleId = (rule) => {
                if (rule.type === 'main') return `${pkg}=${rule.cpus}`;
                if (rule.type === 'thread') return `${pkg}{${rule.thread}}=${rule.cpus}`;
                if (rule.type === 'subprocess') return `${pkg}:${rule.subprocess}=${rule.cpus}`;
                return '';
            };
            const getSourceIcon = (rule) => rule.source?.type === 'cloud' ? '☁️' : '🏠';
            mainRules.forEach(rule => {
                const ruleId = getRuleId(rule);
                const icon = getSourceIcon(rule);
                rulesHtml += `<div class="rule-item" data-ruleid="${this.escapeHtml(ruleId)}"><span class="rule-left"><span class="rule-source-icon">${icon}</span><span class="rule-type type-main">主进程</span></span><div class="rule-right"><span class="rule-cpus">${rule.cpus}</span><span class="rule-delete-btn" data-pkg="${pkg}" data-ruleid="${this.escapeHtml(ruleId)}">✕</span></div></div>`;
            });
            threadRules.forEach(rule => {
                const ruleId = getRuleId(rule);
                const icon = getSourceIcon(rule);
                rulesHtml += `<div class="rule-item" data-ruleid="${this.escapeHtml(ruleId)}"><span class="rule-left"><span class="rule-source-icon">${icon}</span><span class="rule-type type-thread">线程</span><span class="rule-left-text">${rule.thread}</span></span><div class="rule-right"><span class="rule-cpus">${rule.cpus}</span><span class="rule-delete-btn" data-pkg="${pkg}" data-ruleid="${this.escapeHtml(ruleId)}">✕</span></div></div>`;
            });
            subprocessRules.forEach(rule => {
                const ruleId = getRuleId(rule);
                const icon = getSourceIcon(rule);
                rulesHtml += `<div class="rule-item" data-ruleid="${this.escapeHtml(ruleId)}"><span class="rule-left"><span class="rule-source-icon">${icon}</span><span class="rule-type type-subprocess">子进程</span><span class="rule-left-text">${rule.subprocess}</span></span><div class="rule-right"><span class="rule-cpus">${rule.cpus}</span><span class="rule-delete-btn" data-pkg="${pkg}" data-ruleid="${this.escapeHtml(ruleId)}">✕</span></div></div>`;
            });
            return `<div class="package-group"><div class="package-header"><div class="package-info"><span class="package-name">${displayName}</span>${showPkg ? `<span class="package-pkg">${showPkg}</span>` : ''}</div><div class="package-actions"><span class="priority-btn" data-pkg="${pkg}">${priorityText}</span><span class="package-edit" data-pkg="${pkg}">编辑</span><span class="package-delete" data-pkg="${pkg}">删除</span></div></div><div class="package-rules">${rulesHtml}</div></div>`;
        }).join('');
        container.querySelectorAll('.package-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('package-delete') || e.target.classList.contains('package-edit') || e.target.classList.contains('priority-btn')) return;
                e.currentTarget.parentElement.classList.toggle('expanded');
            });
        });
        container.querySelectorAll('.package-delete').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = el.closest('.package-group');
                if (card) card.classList.add('deleting');
                setTimeout(() => this.deletePackageRules(el.dataset.pkg), 300);
            });
        });
        container.querySelectorAll('.package-edit').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditModal(el.dataset.pkg);
            });
        });
        container.querySelectorAll('.rule-delete-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = el.closest('.rule-item');
                if (item) item.classList.add('deleting');
                setTimeout(() => this.deleteSingleRule(el.dataset.pkg, el.dataset.ruleid), 300);
            });
        });
        container.querySelectorAll('.priority-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const pkg = el.dataset.pkg;
                const metaApp = this.rulesMeta?.meta?.apps?.[pkg];
                PriorityManager.show(pkg, metaApp?.appName || '', metaApp?.priority || null);
            });
        });
    }

    getPriorityText(priority) {
        if (!priority) return '优先级';
        const ioNames = { 1: '实时', 2: '尽力', 3: '空闲' };
        return `${priority.nice}/${ioNames[priority.ioClass] || '尽力'}`;
    }

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async deleteSingleRule(pkg, ruleId) {
        const metaApp = this.rulesMeta?.meta?.apps?.[pkg];
        if (!metaApp || !metaApp.rules) return;
        const ruleIndex = metaApp.rules.findIndex(r => {
            let id = '';
            if (r.type === 'main') id = `${pkg}=${r.cpus}`;
            else if (r.type === 'thread') id = `${pkg}{${r.thread}}=${r.cpus}`;
            else if (r.type === 'subprocess') id = `${pkg}:${r.subprocess}=${r.cpus}`;
            return id === ruleId;
        });
        if (ruleIndex === -1) return;
        const rule = metaApp.rules[ruleIndex];
        if (rule.source?.type === 'cloud') {
            this.rulesMeta.addDeletedApp(pkg, rule.source.configId);
        }
        metaApp.rules.splice(ruleIndex, 1);
        if (metaApp.rules.length === 0) {
            delete this.rulesMeta.meta.apps[pkg];
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.showToast('规则已删除');
    }

    async deletePackageRules(pkg) {
        const metaApp = this.rulesMeta?.meta?.apps?.[pkg];
        if (metaApp && metaApp.rules) {
            for (const rule of metaApp.rules) {
                if (rule.source?.type === 'cloud') {
                    this.rulesMeta.addDeletedApp(pkg, rule.source.configId);
                }
            }
        }
        delete this.rulesMeta.meta.apps[pkg];
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.showToast('已删除该应用所有规则');
    }

    showRuleModal() {
        document.getElementById('rule-app-name').value = '';
        document.getElementById('rule-package').value = '';
        document.getElementById('rule-content').value = '';
        document.getElementById('rule-modal').classList.add('show');
    }

    hideRuleModal() {
        document.getElementById('rule-modal').classList.remove('show');
    }

    showEditModal(pkg) {
        const metaApp = this.rulesMeta?.meta?.apps?.[pkg];
        if (!metaApp) return;
        const appName = metaApp.appName || '';
        const rulesText = metaApp.rules.map(r => {
            if (r.type === 'main') return `${pkg}=${r.cpus}`;
            if (r.type === 'thread') return `${pkg}{${r.thread}}=${r.cpus}`;
            if (r.type === 'subprocess') return `${pkg}:${r.subprocess}=${r.cpus}`;
            return '';
        }).filter(l => l).join('\n');
        document.getElementById('edit-app-name').textContent = appName || pkg;
        document.getElementById('edit-app-name-input').value = appName;
        document.getElementById('edit-package').value = pkg;
        document.getElementById('edit-content').value = rulesText;
        document.getElementById('edit-modal').classList.add('show');
    }

    hideEditModal() {
        document.getElementById('edit-modal').classList.remove('show');
    }

    async addRules() {
        const appName = document.getElementById('rule-app-name').value.trim();
        const content = document.getElementById('rule-content').value;
        if (!content.trim()) {
            this.showToast('请输入规则');
            return;
        }
        const lines = content.split('\n');
        const invalidLines = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            if (trimmed.includes('=')) {
                const parts = trimmed.split('=');
                if (parts.length < 2 || !parts[1].trim()) {
                    invalidLines.push(trimmed);
                } else {
                    if (!this.validateCpuRange(parts[1].trim())) {
                        invalidLines.push(trimmed);
                    }
                }
            }
        });
        if (invalidLines.length > 0) {
            if (!document.querySelector('.ui-toast.show')) {
                this.showToast('规则格式错误或核心越界');
            }
            return;
        }
        let firstPkg = '';
        let addedCount = 0;
        lines.forEach(line => {
            const rule = this.parseRuleLine(line);
            if (rule) {
                if (!this.validateCpuRange(rule.cpus)) return;
                if (!firstPkg) firstPkg = rule.package;
                if (!this.rulesMeta.meta.apps[rule.package]) {
                    this.rulesMeta.meta.apps[rule.package] = {
                        appName: '',
                        priority: null,
                        rules: []
                    };
                }
                const metaApp = this.rulesMeta.meta.apps[rule.package];
                const exists = metaApp.rules.some(r => r.type === rule.type && r.thread === rule.thread && r.subprocess === rule.subprocess && r.cpus === rule.cpus);
                if (!exists) {
                    metaApp.rules.push({
                        type: rule.type,
                        thread: rule.thread,
                        subprocess: rule.subprocess,
                        cpus: rule.cpus,
                        source: {
                            type: 'local',
                            configId: null
                        }
                    });
                    addedCount++;
                }
            }
        });
        if (addedCount === 0) {
            this.showToast('没有新规则被添加');
            return;
        }
        if (firstPkg && appName) {
            this.rulesMeta.meta.apps[firstPkg].appName = appName;
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.hideRuleModal();
        this.showToast(`已添加 ${addedCount} 条规则`);
    }

    async saveEditRules() {
        const pkg = document.getElementById('edit-package').value;
        const newAppName = document.getElementById('edit-app-name-input').value.trim();
        const content = document.getElementById('edit-content').value;
        const invalidLines = [];
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            if (trimmed.includes('=')) {
                const parts = trimmed.split('=');
                if (parts.length < 2 || !parts[1].trim()) {
                    invalidLines.push(trimmed);
                } else {
                    if (!this.validateCpuRange(parts[1].trim())) {
                        invalidLines.push(trimmed);
                    }
                }
            }
        });
        if (invalidLines.length > 0) {
            if (!document.querySelector('.ui-toast.show')) {
                this.showToast('规则格式错误或核心越界');
            }
            return;
        }
        const oldMetaApp = this.rulesMeta.meta.apps[pkg];
        const oldPriority = oldMetaApp?.priority || null;
        this.rulesMeta.meta.apps[pkg] = {
            appName: newAppName,
            priority: oldPriority,
            rules: []
        };
        content.split('\n').forEach(line => {
            const rule = this.parseRuleLine(line);
            if (rule && rule.package === pkg) {
                if (this.validateCpuRange(rule.cpus)) {
                    this.rulesMeta.meta.apps[pkg].rules.push({
                        type: rule.type,
                        thread: rule.thread,
                        subprocess: rule.subprocess,
                        cpus: rule.cpus,
                        source: {
                            type: 'local',
                            configId: null
                        }
                    });
                }
            }
        });
        if (this.rulesMeta.meta.apps[pkg].rules.length === 0) {
            delete this.rulesMeta.meta.apps[pkg];
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.hideEditModal();
        this.showToast('规则已保存');
    }

    buildConfigContent() {
        const lines = [];
        const metaApps = this.rulesMeta?.meta?.apps || {};
        for (const [pkg, appData] of Object.entries(metaApps)) {
            if (appData.appName) lines.push(`# @name:${appData.appName}`);
            if (appData.priority) {
                const p = appData.priority;
                lines.push(`# @priority:nice=${p.nice},io=${p.ioClass}-${p.ioLevel}`);
            }
            for (const rule of appData.rules) {
                if (rule.type === 'main') lines.push(`${pkg}=${rule.cpus}`);
                else if (rule.type === 'thread') lines.push(`${pkg}{${rule.thread}}=${rule.cpus}`);
                else if (rule.type === 'subprocess') lines.push(`${pkg}:${rule.subprocess}=${rule.cpus}`);
                else if (rule.type === 'subprocess_thread') lines.push(`${pkg}:${rule.subprocess}{${rule.thread}}=${rule.cpus}`);
            }
        }
        return lines.join('\n');
    }

    async buildConfigContentAsync() {
        const content = this.buildConfigContent();
        if (content && content.trim()) {
            console.log('[Upload] Using memory content, length:', content.length);
            return content;
        }
        const paths = [
            this.rulesMeta.metaFile,
            `${this.modDir}/config/rules_meta.json`,
            `${this.modDir}/rules_meta.json`
        ];
        for (const metaPath of paths) {
            const metaContent = await this.exec(`cat ${metaPath} 2>/dev/null`);
            console.log('[Upload] Trying meta path:', metaPath, 'length:', metaContent?.length || 0);
            if (metaContent && metaContent.trim()) {
                try {
                    const parsed = JSON.parse(metaContent);
                    const lines = [];
                    for (const [pkg, appData] of Object.entries(parsed.apps || {})) {
                        if (appData.appName) lines.push(`# @name:${appData.appName}`);
                        if (appData.priority) {
                            const p = appData.priority;
                            lines.push(`# @priority:nice=${p.nice},io=${p.ioClass}-${p.ioLevel}`);
                        }
                        for (const rule of (appData.rules || [])) {
                            if (rule.type === 'main') lines.push(`${pkg}=${rule.cpus}`);
                            else if (rule.type === 'thread') lines.push(`${pkg}{${rule.thread}}=${rule.cpus}`);
                            else if (rule.type === 'subprocess') lines.push(`${pkg}:${rule.subprocess}=${rule.cpus}`);
                            else if (rule.type === 'subprocess_thread') lines.push(`${pkg}:${rule.subprocess}{${rule.thread}}=${rule.cpus}`);
                        }
                    }
                    if (lines.length > 0) {
                        console.log('[Upload] Built from JSON, lines:', lines.length);
                        return lines.join('\n');
                    }
                } catch (e) {
                    console.log('[Upload] JSON parse error:', e.message);
                }
            }
        }
        const confPaths = [
            this.configFile,
            `${this.modDir}/applist.conf`
        ];
        for (const confPath of confPaths) {
            const fileContent = await this.exec(`cat ${confPath} 2>/dev/null`);
            console.log('[Upload] Trying conf path:', confPath, 'length:', fileContent?.length || 0);
            if (fileContent && fileContent.trim()) {
                const lines = fileContent.split('\n').filter(line => {
                    const trimmed = line.trim();
                    return trimmed && !trimmed.startsWith('# @priority:');
                });
                if (lines.length > 0) {
                    console.log('[Upload] Built from conf, lines:', lines.length);
                    return lines.join('\n');
                }
            }
        }
        console.log('[Upload] No content found');
        return '';
    }

    async loadLog() {
        let serviceLog = '';
        let cloudLog = '';
        if (this.currentLogFilter === 'all' || this.currentLogFilter === 'service') {
            serviceLog = await this.exec(`/system/bin/tail -n 50 ${this.logFile} 2>/dev/null`);
            if (!serviceLog) serviceLog = await this.exec(`/system/bin/logcat -d -t 30 -s StellarCore 2>/dev/null`);
        }
        if (this.currentLogFilter === 'all' || this.currentLogFilter === 'cloud') {
            cloudLog = await this.exec(`/system/bin/cat ${this.cloudLogFile} 2>/dev/null`);
        }
        const parseTime = (line) => {
            const match = line.match(/^\[(\d{4}[-\/]\d{2}[-\/]\d{2}\s+\d{2}:\d{2}:\d{2})\]/);
            if (match) return new Date(match[1].replace(/\//g, '-')).getTime();
            return 0;
        };
        let displayLog = '';
        if (this.currentLogFilter === 'all') {
            const allLines = [];
            if (serviceLog) {
                serviceLog.split('\n').filter(l => l.trim()).forEach(l => {
                    allLines.push({ type: 'service', time: parseTime(l), line: l });
                });
            }
            if (cloudLog) {
                cloudLog.split('\n').filter(l => l.trim()).forEach(l => {
                    allLines.push({ type: 'cloud', time: parseTime(l), line: l.replace(/\[云端\]\s*/, '') });
                });
            }
            allLines.sort((a, b) => a.time - b.time);
            displayLog = allLines.map(item => {
                const tag = item.type === 'service' ? '<span class="log-tag service">服务</span>' : '<span class="log-tag cloud">云端</span>';
                return `<div class="log-line">${tag}${item.line}</div>`;
            }).join('') || '<div class="log-empty">暂无日志</div>';
        } else if (this.currentLogFilter === 'service') {
            displayLog = serviceLog ? serviceLog.split('\n').filter(l => l.trim()).map(l => `<div class="log-line"><span class="log-tag service">服务</span>${l}</div>`).join('') : '<div class="log-empty">暂无服务日志</div>';
        } else {
            displayLog = cloudLog ? cloudLog.split('\n').filter(l => l.trim()).map(l => `<div class="log-line"><span class="log-tag cloud">云端</span>${l.replace(/\[云端\]\s*/, '')}</div>`).join('') : '<div class="log-empty">暂无云端日志</div>';
        }
        document.getElementById('log-viewer').innerHTML = displayLog;
    }

    async clearLog() {
        await this.exec(`/system/bin/echo '' > ${this.logFile}`);
        await this.exec(`/system/bin/echo '' > ${this.cloudLogFile}`);
        document.getElementById('log-viewer').textContent = '日志已清空';
        this.showToast('日志已清空');
    }

    async clearRules() {
        this.rulesMeta.meta.apps = {};
        this.rulesMeta.meta.cloudConfigs = [];
        this.rulesMeta.meta.deletedApps = [];
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.showToast('规则已清空');
    }

    async exportConfig() {
        await this.exec(`/system/bin/cp -f ${this.configFile} ${this.exportPath}`);
        const check = await this.exec(`/system/bin/ls ${this.exportPath} 2>/dev/null`);
        this.showToast(check ? '配置已导出' : '导出失败');
    }

    showImportModal() {
        document.getElementById('import-modal').classList.add('show');
    }

    async doImportConfig() {
        document.getElementById('import-modal').classList.remove('show');
        const importPath = '/storage/emulated/0/applist.conf';
        const content = await this.exec(`cat ${importPath} 2>/dev/null`);
        if (!content || !content.trim()) {
            this.showToast('文件不存在或为空');
            return;
        }
        const parsedApps = this.parseConfigApps(content);
        if (parsedApps.length === 0) {
            this.showToast('未检测到有效规则');
            return;
        }
        this.pendingImportApps = parsedApps;
        const existingApps = this.rulesMeta.meta.apps;
        const conflicts = [];
        for (const app of parsedApps) {
            if (existingApps[app.package]) {
                const existing = existingApps[app.package];
                const cloudSources = existing.rules
                    .filter(r => r.source?.type === 'cloud')
                    .map(r => {
                        const config = this.rulesMeta.meta.cloudConfigs.find(c => c.id === r.source.configId);
                        return config?.name || '未知配置';
                    });
                const hasLocalRules = existing.rules.some(r => r.source?.type === 'local');
                conflicts.push({
                    package: app.package,
                    appName: existing.appName || app.appName || app.package,
                    existingCloudConfigs: [...new Set(cloudSources)],
                    hasLocalRules
                });
            }
        }
        if (conflicts.length > 0) {
            this.pendingImportConflicts = conflicts;
            const body = document.getElementById('import-conflict-body');
            body.innerHTML = `<div style="padding:0 0 12px;color:#8E8E93;">检测到 ${conflicts.length} 个应用与现有配置冲突：</div>` +
                conflicts.map(c => {
                    let sourceText = '';
                    if (c.existingCloudConfigs.length > 0) sourceText = '☁️ ' + c.existingCloudConfigs.join('、');
                    if (c.hasLocalRules) sourceText += (sourceText ? ' + ' : '') + '🏠 本地配置';
                    return `<div class="import-conflict-item"><div class="import-conflict-name">${c.appName}</div><div class="import-conflict-src">${sourceText}</div></div>`;
                }).join('');
            document.getElementById('import-conflict-modal').classList.add('show');
        } else {
            await this.applyImportConfig('overwrite');
        }
    }

    async applyImportConfig(mode) {
        document.getElementById('import-conflict-modal').classList.remove('show');
        if (!this.pendingImportApps || this.pendingImportApps.length === 0) return;
        let appsToImport = this.pendingImportApps;
        if (mode === 'skip' && this.pendingImportConflicts) {
            const conflictPkgs = new Set(this.pendingImportConflicts.map(c => c.package));
            appsToImport = appsToImport.filter(app => !conflictPkgs.has(app.package));
        }
        if (appsToImport.length === 0) {
            this.showToast('跳过冲突后无可导入的配置');
            this.pendingImportApps = null;
            this.pendingImportConflicts = null;
            return;
        }
        this.rulesMeta.meta.deletedApps = [];
        for (const app of appsToImport) {
            const pkg = app.package;
            if (mode === 'overwrite' && this.rulesMeta.meta.apps[pkg]) {
                this.rulesMeta.meta.apps[pkg].rules = [];
            }
            if (!this.rulesMeta.meta.apps[pkg]) {
                this.rulesMeta.meta.apps[pkg] = { appName: app.appName || '', priority: app.priority || null, rules: [] };
            } else {
                if (app.appName) this.rulesMeta.meta.apps[pkg].appName = app.appName;
                if (app.priority) this.rulesMeta.meta.apps[pkg].priority = app.priority;
            }
            for (const rule of app.rules) {
                this.rulesMeta.meta.apps[pkg].rules.push({
                    type: rule.type,
                    thread: rule.thread,
                    subprocess: rule.subprocess,
                    cpus: rule.cpus,
                    source: { type: 'local', configId: null }
                });
            }
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        this.showToast(`已导入 ${appsToImport.length} 个应用的配置`);
        this.pendingImportApps = null;
        this.pendingImportConflicts = null;
    }

    async openUrl(url) {
        await this.exec(`/system/bin/am start -a android.intent.action.VIEW -d "${url}"`);
        this.showToast('正在打开...');
    }

    showQrModal(imgSrc) {
        const modal = document.getElementById('qr-modal');
        document.getElementById('qr-image').src = imgSrc;
        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
    }

    hideQrModal() {
        const modal = document.getElementById('qr-modal');
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    switchPage(page) {
        document.querySelectorAll('.ui-content').forEach(p => p.classList.add('hidden'));
        document.getElementById(`page-${page}`).classList.remove('hidden');
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        document.querySelector(`.tab-item[data-page="${page}"]`).classList.add('active');
        if (page === 'home') this.loadLog();
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    async loadCloudConfigs(forceRefresh = false) {
        const list = document.getElementById('cloud-list');
        list.innerHTML = '<div class="cloud-loading">加载中...</div>';
        try {
            if (forceRefresh) {
                this.cloud.configsCache = null;
                await this.addCloudLog('刷新', '刷新配置列表');
            }
            this.allCloudConfigs = await this.cloud.getDisplayConfigs();
            const total = (this.allCloudConfigs.spotlight?.length || 0) + (this.allCloudConfigs.picks?.length || 0) + (this.allCloudConfigs.normal?.length || 0);
            if (forceRefresh) await this.addCloudLog('刷新', `获取到 ${total} 个配置`);
            this.filterAndRenderCloudConfigs();
        } catch (e) {
            list.innerHTML = '<div class="cloud-loading">加载失败，请检查网络</div>';
        }
    }

    filterAndRenderCloudConfigs() {
        if (!this.allCloudConfigs) return;
        const list = document.getElementById('cloud-list');
        let { spotlight, picks, normal } = this.allCloudConfigs;
        const filterFn = (configs) => {
            let result = configs;
            if (this.currentSource === 'official') result = result.filter(c => c.isOfficial);
            else if (this.currentSource === 'community') result = result.filter(c => !c.isOfficial);
            if (this.currentCategory !== 'all') result = result.filter(c => c.category === this.currentCategory);
            if (this.currentSearchTerm) {
                const term = this.currentSearchTerm.toLowerCase();
                result = result.filter(c =>
                    (c.name && c.name.toLowerCase().includes(term)) ||
                    (c.description && c.description.toLowerCase().includes(term)) ||
                    (c.tags && c.tags.some(t => t.toLowerCase().includes(term))) ||
                    (c.processors && c.processors.some(p => p.toLowerCase().includes(term)))
                );
            }
            return result;
        };
        spotlight = filterFn(spotlight);
        picks = filterFn(picks);
        normal = filterFn(normal);
        let html = '';
        if (spotlight.length > 0) {
            html += '<div class="cloud-section"><div class="cloud-section-title">官方推荐</div>';
            spotlight.forEach(config => html += this.renderCloudItem(config));
            html += '</div>';
        }
        if (picks.length > 0) {
            html += '<div class="cloud-section"><div class="cloud-section-title">精选配置</div>';
            picks.forEach(config => html += this.renderCloudItem(config));
            html += '</div>';
        }
        if (normal.length > 0) {
            html += '<div class="cloud-section"><div class="cloud-section-title">全部配置</div>';
            normal.forEach(config => html += this.renderCloudItem(config));
            html += '</div>';
        }
        if (!html) html = '<div class="cloud-loading">暂无配置</div>';
        list.innerHTML = html;
        list.querySelectorAll('.cloud-item').forEach(item => {
            item.addEventListener('click', () => this.showConfigDetail(item.dataset.objectid));
        });
    }

    renderCloudItem(config) {
        const isDerivative = config.baseConfigs && config.baseConfigs.length > 0;
        let badgeHtml = config.badge ? `<span class="cloud-item-badge ${config.isOfficial ? 'official' : ''}">${escapeHtml(config.badge)}</span>` : '';
        if (isDerivative) badgeHtml += '<span class="cloud-item-badge derivative">二改</span>';
        const processorsHtml = config.processors && config.processors.length > 0 ? `<div class="cloud-item-tags">${config.processors.map(p => `<span class="cloud-tag processor">${escapeHtml(p)}</span>`).join('')}</div>` : '';
        const tagsHtml = config.tags && config.tags.length > 0 ? `<div class="cloud-item-tags">${config.tags.slice(0, 3).map(t => `<span class="cloud-tag">${escapeHtml(t)}</span>`).join('')}</div>` : '';
        const rating = config.ratingCount > 0 ? (config.ratingSum / config.ratingCount).toFixed(1) : '-';
        return `<div class="cloud-item" data-objectid="${config.objectId}"><div class="cloud-item-header"><span class="cloud-item-name">${escapeHtml(config.name) || '未命名'}${badgeHtml}</span><span class="cloud-item-downloads">${this.formatNumber(config.downloads || 0)} 次下载</span></div><div class="cloud-item-meta">${escapeHtml(config.author) || '匿名'} · ${config.isOfficial ? '官方' : '社区'} · <span class="cloud-item-version">v${config.version || 1}</span> <span class="cloud-item-rating">⭐${rating}</span></div><div class="cloud-item-desc">${escapeHtml(config.description) || ''}</div>${processorsHtml}${tagsHtml}</div>`;
    }

    formatNumber(num) {
        if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num.toString();
    }

    async showConfigDetail(objectId) {
        const body = document.getElementById('cloud-detail-body');
        const footer = document.getElementById('cloud-detail-footer');
        body.innerHTML = '<div style="text-align:center;padding:40px;color:#8E8E93;">加载中...</div>';
        document.getElementById('cloud-detail-modal').classList.add('show');
        const detail = await this.cloud.fetchConfigDetail(objectId);
        if (!detail) { body.innerHTML = '<div style="text-align:center;padding:40px;color:#8E8E93;">加载失败</div>'; return; }
        this.currentCloudConfig = detail;
        const rating = detail.ratingCount > 0 ? (detail.ratingSum / detail.ratingCount).toFixed(1) : '-';
        const isAuthor = await this.cloud.isConfigAuthor(objectId);
        const userRating = await this.cloud.getUserRating(objectId);
        const ratingHtml = this.renderRatingStars(userRating);
        const tagsHtml = detail.tags && detail.tags.length > 0 ? `<div class="cloud-detail-section"><div class="cloud-detail-section-title">标签</div><div class="cloud-detail-tags">${detail.tags.map(t => `<span class="cloud-tag">${escapeHtml(t)}</span>`).join('')}</div></div>` : '';
        const processorsHtml = detail.processors && detail.processors.length > 0 ? `<div class="cloud-detail-section"><div class="cloud-detail-section-title">适配处理器</div><div class="cloud-detail-tags">${detail.processors.map(p => `<span class="cloud-tag">${escapeHtml(p)}</span>`).join('')}</div></div>` : '';
        body.innerHTML = `<div class="cloud-detail-name">${escapeHtml(detail.name) || '未命名'}</div><div class="cloud-detail-author">${escapeHtml(detail.author) || '匿名'} · ${detail.isOfficial ? '官方配置' : '社区配置'}</div><div class="cloud-detail-stats"><div class="cloud-detail-stat"><div class="cloud-detail-stat-value">${this.formatNumber(detail.downloads || 0)}</div><div class="cloud-detail-stat-label">下载</div></div><div class="cloud-detail-stat"><div class="cloud-detail-stat-value">${rating}</div><div class="cloud-detail-stat-label">评分</div></div><div class="cloud-detail-stat"><div class="cloud-detail-stat-value">v${detail.version || 1}</div><div class="cloud-detail-stat-label">版本</div></div></div><div class="cloud-detail-desc">${escapeHtml(detail.description) || '暂无描述'}</div>${processorsHtml}${tagsHtml}<div class="cloud-detail-section"><div class="cloud-detail-section-title">评分</div><div class="rating-container" id="rating-container">${ratingHtml}</div></div>`;
        if (isAuthor) {
            footer.innerHTML = `<div class="cloud-author-actions"><div class="cloud-edit-btn" id="cloud-edit-btn">修改配置</div><div class="cloud-delete-btn" id="cloud-delete-btn">删除配置</div></div><div class="cloud-apply-btn" id="cloud-apply-btn">应用此配置</div>`;
            document.getElementById('cloud-edit-btn').addEventListener('click', () => this.showConfigUpdateModal(detail));
            document.getElementById('cloud-delete-btn').addEventListener('click', () => this.deleteMyConfig(objectId));
        } else {
            footer.innerHTML = `<div class="cloud-apply-btn" id="cloud-apply-btn">应用此配置</div>`;
        }
        document.getElementById('cloud-apply-btn').addEventListener('click', () => {
            document.getElementById('cloud-detail-modal').classList.remove('show');
            document.getElementById('download-mode-modal').classList.add('show');
        });
        this.bindRatingStarEvents(objectId, userRating);
    }

    renderRatingStars(userRating) {
        if (userRating) return `<div class="rating-done">您已评分：${'⭐'.repeat(userRating)}</div>`;
        let html = '<div class="rating-stars">';
        for (let i = 1; i <= 5; i++) html += `<span class="rating-star" data-rating="${i}">☆</span>`;
        html += '</div><div class="rating-hint">点击星星评分</div>';
        return html;
    }

    bindRatingStarEvents(objectId, userRating) {
        if (userRating) return;
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach(star => {
            star.addEventListener('mouseenter', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                stars.forEach((s, i) => s.textContent = i < rating ? '⭐' : '☆');
            });
            star.addEventListener('mouseleave', () => stars.forEach(s => s.textContent = '☆'));
            star.addEventListener('click', async (e) => {
                const rating = parseInt(e.target.dataset.rating);
                const result = await this.cloud.rateConfig(objectId, rating);
                this.showToast(result.message);
                if (result.success) {
                    document.getElementById('rating-container').innerHTML = `<div class="rating-done">您已评分：${'⭐'.repeat(rating)}</div>`;
                    await this.addCloudLog('评分', `${this.currentCloudConfig?.name || '未知配置'} ${rating}星`);
                }
            });
        });
    }

    async showSelectAppsModal() {
        if (!this.currentCloudConfig) return;
        this.showToast('正在解析配置...');
        const content = await this.cloud.downloadConfig(this.currentCloudConfig.objectId);
        if (!content) { this.showToast('获取配置失败'); return; }
        this.pendingConfigContent = content;
        this.pendingConfigApps = this.parseConfigApps(content);
        this.selectedApps = new Set(this.pendingConfigApps.map(app => app.package));
        document.getElementById('select-apps-search').value = '';
        this.renderSelectAppsList();
        document.getElementById('select-apps-modal').classList.add('show');
    }

    parseConfigApps(content) {
        const apps = [];
        const appMap = {};
        let currentAppName = '';
        let currentPriority = null;
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const nameMatch = trimmed.match(/^#\s*@name:(.+)$/);
            if (nameMatch) { currentAppName = nameMatch[1].trim(); return; }
            const priorityMatch = trimmed.match(/^#\s*@priority:(.+)$/);
            if (priorityMatch) {
                const parts = priorityMatch[1];
                const niceMatch = parts.match(/nice=(-?\d+)/);
                const ioMatch = parts.match(/io=(\d+)-(\d+)/);
                if (niceMatch && ioMatch) {
                    currentPriority = { nice: parseInt(niceMatch[1]), ioClass: parseInt(ioMatch[1]), ioLevel: parseInt(ioMatch[2]) };
                }
                return;
            }
            if (trimmed.startsWith('#')) return;
            const rule = this.parseRuleLine(trimmed);
            if (rule) {
                if (!appMap[rule.package]) {
                    appMap[rule.package] = { package: rule.package, appName: currentAppName || '', priority: currentPriority, rules: [] };
                    apps.push(appMap[rule.package]);
                    currentPriority = null;
                }
                appMap[rule.package].rules.push({ ...rule, raw: trimmed });
                if (currentAppName && !appMap[rule.package].appName) appMap[rule.package].appName = currentAppName;
            }
        });
        return apps;
    }

    renderSelectAppsList() {
        const list = document.getElementById('select-apps-list');
        const searchTerm = document.getElementById('select-apps-search')?.value?.toLowerCase() || '';
        let apps = this.pendingConfigApps;
        if (searchTerm) {
            apps = apps.filter(app =>
                app.package.toLowerCase().includes(searchTerm) ||
                (app.appName && app.appName.toLowerCase().includes(searchTerm))
            );
        }
        if (apps.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#8E8E93;">暂无应用</div>';
            return;
        }
        list.innerHTML = apps.map(app => {
            const isSelected = this.selectedApps.has(app.package);
            const displayName = app.appName || app.package;
            const showPkg = app.appName ? app.package : '';
            const rulesHtml = app.rules.map(rule => {
                let typeLabel = '主进程', detail = '';
                if (rule.type === 'thread') { typeLabel = '线程'; detail = rule.thread; }
                else if (rule.type === 'subprocess') { typeLabel = '子进程'; detail = rule.subprocess; }
                return `<div class="select-app-rule-item"><span>${typeLabel}${detail ? `: ${detail}` : ''}</span><span>${rule.cpus}</span></div>`;
            }).join('');
            return `<div class="select-app-group" data-pkg="${app.package}"><div class="select-app-header"><div class="select-app-left"><div class="select-app-checkbox ${isSelected ? 'checked' : ''}" data-pkg="${app.package}"></div><div class="select-app-info"><span class="select-app-name">${displayName}</span>${showPkg ? `<span class="select-app-pkg">${showPkg}</span>` : ''}</div></div><span style="color:#8E8E93;font-size:12px;">${app.rules.length} 条规则</span></div><div class="select-app-rules">${rulesHtml}</div></div>`;
        }).join('');
        list.querySelectorAll('.select-app-checkbox').forEach(cb => {
            cb.addEventListener('click', (e) => {
                e.stopPropagation();
                const pkg = cb.dataset.pkg;
                if (this.selectedApps.has(pkg)) {
                    this.selectedApps.delete(pkg);
                    cb.classList.remove('checked');
                } else {
                    this.selectedApps.add(pkg);
                    cb.classList.add('checked');
                }
            });
        });
        list.querySelectorAll('.select-app-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('select-app-checkbox')) return;
                header.parentElement.classList.toggle('expanded');
            });
        });
    }

    async previewConfig(objectId) {
        const content = await this.cloud.downloadConfig(objectId);
        if (!content) { this.showToast('获取配置失败'); return; }
        document.getElementById('preview-content').value = content;
        document.getElementById('preview-modal').classList.add('show');
    }

    async applyCloudConfig(mode) {
        if (!this.currentCloudConfig) return;
        let content;
        const configId = this.currentCloudConfig.objectId;
        const configInfo = {
            id: configId,
            name: this.currentCloudConfig.name,
            version: this.currentCloudConfig.version || 1,
            author: this.currentCloudConfig.author || ''
        };
        let selectedPkgSet = null;
        if (this.pendingConfigContent && this.selectedApps.size > 0 && this.selectedApps.size < this.pendingConfigApps.length) {
            selectedPkgSet = this.selectedApps;
            const lines = [];
            this.pendingConfigApps.forEach(app => {
                if (selectedPkgSet.has(app.package)) {
                    if (app.appName) lines.push(`# @name:${app.appName}`);
                    app.rules.forEach(rule => lines.push(rule.raw));
                }
            });
            content = lines.join('\n');
            await this.addCloudLog('下载', `${this.currentCloudConfig.name} (选择 ${this.selectedApps.size}/${this.pendingConfigApps.length} 个应用)`);
        } else {
            this.showToast('正在下载配置...');
            content = await this.cloud.downloadConfig(this.currentCloudConfig.objectId);
            if (!content) { this.showToast('下载配置失败'); return; }
            await this.addCloudLog('下载', `${this.currentCloudConfig.name} v${this.currentCloudConfig.version || 1}`);
        }
        let parsedApps = this.parseConfigApps(content);
        if (mode !== 'replace') {
            const conflicts = detectConflicts(this.rulesMeta.meta.apps, parsedApps, configId, this.rulesMeta.meta.cloudConfigs);
            if (conflicts.length > 0) {
                const userChoice = await this.showConflictDialog(conflicts, mode);
                if (userChoice === 'cancel') {
                    this.showToast('已取消');
                    this.pendingConfigContent = null;
                    this.pendingConfigApps = [];
                    this.selectedApps.clear();
                    return;
                }
                if (userChoice === 'skip') {
                    const conflictPkgs = new Set(conflicts.map(c => c.package));
                    parsedApps = parsedApps.filter(app => !conflictPkgs.has(app.package));
                    if (selectedPkgSet) conflictPkgs.forEach(pkg => selectedPkgSet.delete(pkg));
                    if (parsedApps.length === 0) {
                        this.showToast('跳过冲突后无可应用的配置');
                        this.pendingConfigContent = null;
                        this.pendingConfigApps = [];
                        this.selectedApps.clear();
                        return;
                    }
                    await this.addCloudLog('冲突', `跳过 ${conflicts.length} 个冲突应用`);
                }
            }
        }
        if (mode === 'replace') {
            this.rulesMeta.meta.apps = {};
            this.rulesMeta.meta.cloudConfigs = [];
            this.rulesMeta.meta.deletedApps = [];
        }
        this.rulesMeta.addCloudConfig(configInfo);
        for (const app of parsedApps) {
            if (selectedPkgSet && !selectedPkgSet.has(app.package)) continue;
            const pkg = app.package;
            if (!this.rulesMeta.meta.apps[pkg]) {
                this.rulesMeta.meta.apps[pkg] = { appName: app.appName || '', priority: app.priority || null, rules: [] };
            } else {
                if (app.appName) this.rulesMeta.meta.apps[pkg].appName = app.appName;
                if (app.priority) this.rulesMeta.meta.apps[pkg].priority = app.priority;
            }
            for (const rule of app.rules) {
                if (mode === 'merge') {
                    const existingIdx = this.rulesMeta.meta.apps[pkg].rules.findIndex(r =>
                        r.type === rule.type && r.thread === rule.thread && r.subprocess === rule.subprocess
                    );
                    if (existingIdx !== -1) {
                        this.rulesMeta.meta.apps[pkg].rules[existingIdx] = {
                            type: rule.type, thread: rule.thread, subprocess: rule.subprocess, cpus: rule.cpus,
                            source: { type: 'cloud', configId: configId }
                        };
                        continue;
                    }
                }
                this.rulesMeta.meta.apps[pkg].rules.push({
                    type: rule.type, thread: rule.thread, subprocess: rule.subprocess, cpus: rule.cpus,
                    source: { type: 'cloud', configId: configId }
                });
            }
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        const modeText = mode === 'replace' ? '替换' : (mode === 'merge' ? '合并' : '追加');
        await this.addCloudLog('应用', `${this.currentCloudConfig.name} (${modeText}模式)`);
        this.showToast('配置已应用');
        this.pendingConfigContent = null;
        this.pendingConfigApps = [];
        this.selectedApps.clear();
    }

    showConflictDialog(conflicts, mode) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'ui-modal';
            overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;';
            const configNameMap = {};
            this.rulesMeta.meta.cloudConfigs.forEach(c => configNameMap[c.id] = c.name);
            const conflictList = conflicts.map(c => {
                let sourceText = '';
                if (c.existingCloudConfigs && c.existingCloudConfigs.length > 0) sourceText = '☁️ ' + c.existingCloudConfigs.join('、');
                if (c.hasLocalRules) sourceText += (sourceText ? ' + ' : '') + '🏠 本地配置';
                return `<div class="conflict-item"><div class="conflict-name">${c.appName}</div><div class="conflict-src">${sourceText}</div></div>`;
            }).join('');
            const modeActionText = mode === 'merge' ? '覆盖冲突规则' : '追加新规则';
            overlay.innerHTML = `<div class="modal-content modal-large"><div class="modal-header" style="justify-content:center;border-bottom:0;"><span class="modal-title">检测到 ${conflicts.length} 个应用冲突</span></div><div class="conflict-list">${conflictList}</div><div class="modal-footer conflict-actions"><div class="modal-btn primary" data-action="overwrite">${modeActionText}</div><div class="modal-btn" data-action="skip" style="color:#FF9500;">跳过冲突</div><div class="modal-btn cancel" data-action="cancel">取消下载</div></div></div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
            overlay.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    overlay.classList.remove('show');
                    setTimeout(() => overlay.remove(), 200);
                    resolve(btn.dataset.action);
                });
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('show');
                    setTimeout(() => overlay.remove(), 200);
                    resolve('cancel');
                }
            });
        });
    }

    async showUploadModal() {
        const appsCount = Object.keys(this.rulesMeta?.meta?.apps || {}).length;
        if (appsCount === 0) {
            let hasRules = false;
            const paths = [
                this.rulesMeta.metaFile,
                `${this.modDir}/config/rules_meta.json`,
                `${this.modDir}/rules_meta.json`
            ];
            for (const metaPath of paths) {
                if (hasRules) break;
                const metaContent = await this.exec(`cat ${metaPath} 2>/dev/null`);
                if (metaContent && metaContent.trim()) {
                    try {
                        const parsed = JSON.parse(metaContent);
                        hasRules = Object.keys(parsed.apps || {}).length > 0;
                    } catch (e) { }
                }
            }
            if (!hasRules) {
                const confPaths = [
                    this.configFile,
                    `${this.modDir}/applist.conf`
                ];
                for (const confPath of confPaths) {
                    if (hasRules) break;
                    const fileContent = await this.exec(`cat ${confPath} 2>/dev/null`);
                    hasRules = fileContent && fileContent.split('\n').some(line => {
                        const trimmed = line.trim();
                        return trimmed && !trimmed.startsWith('#') && trimmed.includes('=');
                    });
                }
            }
            if (!hasRules) {
                this.showToast('请先添加规则再上传');
                return;
            }
        }
        const nickname = this.cloud.getNickname();
        if (!nickname) { this.showToast('请先设置昵称'); return; }
        const authInput = document.getElementById('upload-auth');
        authInput.value = nickname;
        authInput.readOnly = true;
        authInput.style.backgroundColor = 'rgba(128,128,128,0.1)';
        authInput.style.color = 'var(--text-secondary)';
        document.getElementById('upload-name').value = '';
        document.getElementById('upload-version').value = '';
        document.getElementById('upload-desc').value = '';
        document.getElementById('upload-category').value = 'general';
        document.getElementById('upload-category-text').textContent = '综合';
        document.querySelectorAll('#upload-category-options .ui-select-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.value === 'general');
        });
        document.getElementById('upload-processors').value = '';
        document.getElementById('upload-tags').value = '';
        const hasCloudConfigs = this.rulesMeta.hasCloudConfigs();
        let baseHint = document.getElementById('upload-base-hint');
        if (!baseHint) {
            baseHint = document.createElement('div');
            baseHint.id = 'upload-base-hint';
            baseHint.className = 'upload-base-hint';
            const uploadForm = document.getElementById('upload-form');
            if (uploadForm) uploadForm.insertBefore(baseHint, uploadForm.firstChild);
        }
        if (hasCloudConfigs) {
            const baseNames = this.rulesMeta.meta.cloudConfigs.map(c => c.name).join('、');
            baseHint.innerHTML = `<span class="base-hint-icon">📦</span> 将标记为基于「${baseNames}」的二改配置`;
            baseHint.style.display = 'block';
        } else {
            baseHint.style.display = 'none';
        }
        document.getElementById('upload-form').classList.remove('hidden');
        document.getElementById('upload-progress').classList.remove('show');
        document.getElementById('upload-modal').classList.add('show');
    }

    async submitUpload() {
        const nickname = this.cloud.getNickname();
        if (!nickname) { this.showToast('请先设置昵称'); return; }
        const name = document.getElementById('upload-name').value.trim();
        const version = document.getElementById('upload-version').value.trim();
        const desc = document.getElementById('upload-desc').value.trim();
        const category = document.getElementById('upload-category').value;
        const processors = document.getElementById('upload-processors').value.trim();
        const tags = document.getElementById('upload-tags').value.trim();
        if (!name) { this.showToast('请输入配置名称'); return; }
        if (!version) { this.showToast('请输入版本号'); return; }
        if (!desc) { this.showToast('请输入配置描述'); return; }
        if (!processors) { this.showToast('请输入适配处理器'); return; }
        if (!tags) { this.showToast('请输入标签'); return; }
        const content = await this.buildConfigContentAsync();
        console.log('[Upload] Content length:', content?.length || 0, 'Preview:', content?.substring(0, 200));
        if (!content) { this.showToast('当前没有规则可上传'); return; }
        const baseConfigs = this.rulesMeta.getBaseConfigsForUpload();
        document.getElementById('upload-form').classList.add('hidden');
        document.getElementById('upload-progress').classList.add('show');
        document.getElementById('upload-status').textContent = baseConfigs.length > 0 ? '正在上传(二改配置)...' : '正在上传...';
        const result = await this.cloud.uploadConfig(name, desc, category, tags, content, nickname, version, processors, baseConfigs);
        document.getElementById('upload-modal').classList.remove('show');
        document.getElementById('upload-form').classList.remove('hidden');
        document.getElementById('upload-progress').classList.remove('show');
        this.showToast(result.message);
        if (result.success) await this.addCloudLog('上传', `${name} v${version} 成功`);
    }

    async showMyConfigs() {
        document.getElementById('my-configs-modal').classList.add('show');
        const searchInput = document.getElementById('my-configs-search');
        if (searchInput) searchInput.value = '';
        this.myConfigsSearchTerm = '';
        await this.loadMyConfigs();
    }

    async showAccountModal() {
        const modal = document.getElementById('account-modal');
        if (!modal) return;
        modal.classList.add('show');
        const body = document.getElementById('account-body');
        body.innerHTML = '<div class="cloud-loading">加载中...</div>';
        try {
            const profile = await this.cloud.getDeviceProfile();
            if (!profile || !profile.success) {
                body.innerHTML = '<div class="cloud-loading">加载失败</div>';
                return;
            }
            const createdAt = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('zh-CN') : '未知';
            let authStatusText = '需审核';
            let authStatusColor = '#FF9500';
            if (profile.isAuthorized) {
                authStatusText = '已授权 ✓';
                authStatusColor = '#34C759';
            } else if (profile.hasAuthCode) {
                authStatusText = '授权码已失效';
                authStatusColor = '#FF3B30';
            }
            body.innerHTML = `
                <div class="account-info-section">
                    <div class="account-info-row">
                        <span class="account-info-label">昵称</span>
                        <span class="account-info-value">${escapeHtml(profile.nickname) || '未设置'}</span>
                    </div>
                    <div class="account-info-row">
                        <span class="account-info-label">注册时间</span>
                        <span class="account-info-value">${createdAt}</span>
                    </div>
                    <div class="account-info-row">
                        <span class="account-info-label">管理密码</span>
                        <span class="account-info-value">${profile.hasPassword ? '已设置 ✓' : '未设置'}</span>
                    </div>
                    <div class="account-info-row">
                        <span class="account-info-label">上传权限</span>
                        <span class="account-info-value" style="color:${authStatusColor}">${authStatusText}</span>
                    </div>
                </div>
                <div class="account-auth-section" style="margin-bottom:16px;">
                    <div class="account-recovery-label">授权码</div>
                    <div class="account-recovery-box">
                        <input type="text" class="register-input" id="account-auth-code" placeholder="${profile.isAuthorized ? '已授权，可更换授权码' : '输入授权码'}" style="flex:1;margin-right:10px;">
                        <button class="account-recovery-btn" id="account-verify-auth">${profile.isAuthorized ? '更换' : '验证'}</button>
                    </div>
                    <div class="account-recovery-warning">${profile.isAuthorized ? '更换后使用新授权码权限' : '授权后上传配置无需审核'}</div>
                </div>
                <div class="account-recovery-section">
                    <div class="account-recovery-label">恢复码</div>
                    <div class="account-recovery-box">
                        <span class="account-recovery-code" id="account-recovery-display">••••-••••-••••</span>
                        <button class="account-recovery-btn" id="account-show-recovery">${profile.hasPassword ? '重新生成' : '无法查看'}</button>
                    </div>
                    <div class="account-recovery-warning">⚠️ 点击将生成新恢复码，旧码失效</div>
                </div>
            `;
            const showBtn = document.getElementById('account-show-recovery');
            if (showBtn && profile.hasPassword) {
                showBtn.addEventListener('click', () => this.showRecoveryCodeVerify());
            } else if (showBtn) {
                showBtn.disabled = true;
                showBtn.style.opacity = '0.5';
            }
            const verifyAuthBtn = document.getElementById('account-verify-auth');
            if (verifyAuthBtn) {
                verifyAuthBtn.addEventListener('click', () => this.verifyAuthCode());
            }
        } catch (e) {
            body.innerHTML = '<div class="cloud-loading">加载失败</div>';
        }
    }

    async verifyAuthCode() {
        const authCode = document.getElementById('account-auth-code')?.value.trim();
        if (!authCode) {
            this.showToast('请输入授权码');
            return;
        }
        this.showToast('验证中...');
        const result = await this.cloud.verifyAuthCode(authCode);
        if (result && result.success) {
            this.showToast('授权成功');
            this.showAccountModal();
        } else {
            this.showToast(result?.message || '授权失败');
        }
    }

    showRecoveryCodeVerify() {
        const modal = document.getElementById('recovery-verify-modal');
        if (!modal) return;
        document.getElementById('recovery-verify-input').value = '';
        modal.classList.add('show');
    }

    async verifyAndShowRecovery() {
        const password = document.getElementById('recovery-verify-input').value.trim();
        if (!password) {
            this.showToast('请输入管理密码');
            return;
        }
        this.showToast('验证中...');
        const result = await this.cloud.verifyPasswordForRecovery(password);
        if (result && result.success && result.recoveryCode) {
            document.getElementById('recovery-verify-modal').classList.remove('show');
            const display = document.getElementById('account-recovery-display');
            const btn = document.getElementById('account-show-recovery');
            if (display) {
                display.textContent = result.recoveryCode;
                display.style.color = 'var(--text-primary)';
            }
            if (btn) {
                btn.textContent = '已更新';
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
            this.showToast('恢复码已更新，请截图保存');
        } else {
            this.showToast(result?.message || '验证失败');
        }
    }

    async loadMyConfigs(forceRefresh = false) {
        const body = document.getElementById('my-configs-body');
        body.innerHTML = '<div class="cloud-loading">加载中...</div>';
        try {
            if (forceRefresh) this.myConfigsCache = null;
            if (!this.myConfigsCache) this.myConfigsCache = await this.cloud.getMyConfigs();
            this.filterAndRenderMyConfigs();
        } catch (e) {
            body.innerHTML = '<div class="cloud-loading">加载失败，请检查网络</div>';
        }
    }

    filterAndRenderMyConfigs() {
        const body = document.getElementById('my-configs-body');
        let configs = this.myConfigsCache || [];
        if (this.myConfigsSearchTerm) {
            const term = this.myConfigsSearchTerm.toLowerCase();
            configs = configs.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.description && c.description.toLowerCase().includes(term)) ||
                (c.tags && c.tags.some(t => t.toLowerCase().includes(term)))
            );
        }
        if (!configs || configs.length === 0) {
            body.innerHTML = this.myConfigsSearchTerm
                ? `<div class="my-configs-empty"><div class="my-configs-empty-icon">🔍</div><div>未找到匹配的配置</div><div style="margin-top:8px;font-size:12px;">试试其他关键词</div></div>`
                : `<div class="my-configs-empty"><div class="my-configs-empty-icon">📦</div><div>暂无上传的配置</div><div style="margin-top:8px;font-size:12px;">上传配置后将在这里显示</div></div>`;
            return;
        }
        const categoryMap = { game: '游戏', daily: '日用', general: '综合' };
        const statusMap = { 
            active: { text: '已通过', color: '#34C759' }, 
            pending: { text: '待审核', color: '#FF9500' }, 
            rejected: { text: '已拒绝', color: '#FF3B30' } 
        };
        body.innerHTML = configs.map(config => {
            const rating = config.ratingCount > 0 ? (config.ratingSum / config.ratingCount).toFixed(1) : '-';
            const categoryName = categoryMap[config.category] || config.category;
            const status = statusMap[config.status] || statusMap.pending;
            return `<div class="my-config-item" data-objectid="${config.objectId}"><div class="my-config-header"><span class="my-config-name">${escapeHtml(config.name) || '未命名'}</span><span class="my-config-status" style="color:${status.color};font-size:12px;margin-left:8px;">${status.text}</span></div><div class="my-config-meta"><span>${categoryName}</span><span>v${config.version || 1}</span><span>⭐${rating}</span><span>${this.formatNumber(config.downloads || 0)} 下载</span></div>${config.description ? `<div class="my-config-desc">${escapeHtml(config.description)}</div>` : ''}</div>`;
        }).join('');
        body.querySelectorAll('.my-config-item').forEach(item => {
            item.addEventListener('click', () => {
                document.getElementById('my-configs-modal').classList.remove('show');
                this.showConfigDetail(item.dataset.objectid);
            });
        });
    }

    async deleteMyConfig(objectId) {
        const config = this.myConfigsCache?.find(c => c.objectId === objectId) || this.currentCloudConfig;
        const configName = config?.name || '此配置';
        const confirmed = await this.showConfirmDialog(`确定要删除「${configName}」吗？`, '删除后无法恢复');
        if (!confirmed) return;
        this.showToast('正在删除...');
        try {
            const result = await this.cloud.deleteConfig(objectId);
            this.showToast(result.success ? '删除成功' : (`删除失败: ${result.message}`));
            if (result.success) {
                document.getElementById('cloud-detail-modal').classList.remove('show');
                this.myConfigsCache = null;
                this.cloud.configsCache = null;
                await this.loadCloudConfigs(true);
            }
        } catch (e) {
            this.showToast(`删除异常: ${e.message}`);
        }
    }

    showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-dialog-overlay';
            overlay.innerHTML = `<div class="confirm-dialog"><div class="confirm-dialog-title">${title}</div><div class="confirm-dialog-message">${message}</div><div class="confirm-dialog-buttons"><div class="confirm-dialog-btn confirm-dialog-cancel">取消</div><div class="confirm-dialog-btn confirm-dialog-confirm">删除</div></div></div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
            const cleanup = (result) => {
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 200);
                resolve(result);
            };
            overlay.querySelector('.confirm-dialog-cancel').addEventListener('click', () => cleanup(false));
            overlay.querySelector('.confirm-dialog-confirm').addEventListener('click', () => cleanup(true));
            overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
        });
    }

    showConfigUpdateModal(config) {
        document.getElementById('cloud-detail-modal').classList.remove('show');
        const modal = document.getElementById('config-update-modal');
        if (!modal) return;
        document.getElementById('config-update-objectid').value = config.objectId;
        document.getElementById('config-update-name').value = config.name || '';
        document.getElementById('config-update-version').value = config.version || 1;
        document.getElementById('config-update-desc').value = config.description || '';
        document.getElementById('config-update-content').value = config.content || '';
        document.getElementById('config-update-processors').value = (config.processors || []).join(' ');
        document.getElementById('config-update-tags').value = (config.tags || []).join(' ');
        document.getElementById('config-update-changelog').value = '';
        const category = config.category || 'game';
        const categoryMap = { game: '游戏', daily: '日用' };
        document.getElementById('config-update-category').value = category;
        document.getElementById('config-update-category-text').textContent = categoryMap[category] || '游戏';
        document.querySelectorAll('#config-update-category-options .ui-select-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.value === category);
        });
        document.getElementById('config-update-form').classList.remove('hidden');
        document.getElementById('config-update-progress').classList.remove('show');
        modal.classList.add('show');
    }

    async applyCloudUpdates() {
        const checkedConfigs = document.querySelectorAll('.update-config-checkbox.checked');
        if (checkedConfigs.length === 0) {
            this.showToast('没有选择要更新的配置');
            document.getElementById('check-update-modal').classList.remove('show');
            return;
        }
        this.showToast('正在更新配置...');
        for (const item of checkedConfigs) {
            const configId = item.dataset.id;
            const config = this.rulesMeta.meta.cloudConfigs.find(c => c.id === configId);
            if (!config) continue;
            const detail = await this.cloud.fetchConfigDetail(configId);
            if (!detail) continue;
            for (const [pkg, appData] of Object.entries(this.rulesMeta.meta.apps)) {
                appData.rules = appData.rules.filter(r => r.source?.configId !== configId);
                if (appData.rules.length === 0) delete this.rulesMeta.meta.apps[pkg];
            }
            const newApps = this.parseConfigApps(detail.content);
            for (const newApp of newApps) {
                if (this.rulesMeta.isAppDeleted(newApp.package, configId)) continue;
                if (!this.rulesMeta.meta.apps[newApp.package]) {
                    this.rulesMeta.meta.apps[newApp.package] = { appName: newApp.appName || '', priority: null, rules: [] };
                }
                for (const rule of newApp.rules) {
                    this.rulesMeta.meta.apps[newApp.package].rules.push({
                        type: rule.type, thread: rule.thread, subprocess: rule.subprocess, cpus: rule.cpus,
                        source: { type: 'cloud', configId: configId }
                    });
                }
            }
            this.rulesMeta.updateCloudConfigVersion(configId, detail.version);
        }
        const restoreItems = document.querySelectorAll('.deleted-app-checkbox.checked');
        for (const item of restoreItems) {
            const pkg = item.closest('.deleted-app-item')?.dataset.pkg;
            const cfgId = item.closest('.deleted-app-item')?.dataset.config;
            if (pkg && cfgId) this.rulesMeta.removeDeletedApp(pkg, cfgId);
        }
        await this.rulesMeta.save();
        this.renderRules();
        renderConfigSourceList(this.rulesMeta.meta);
        document.getElementById('check-update-modal').classList.remove('show');
        this.showToast('配置已更新');
    }

    async submitConfigUpdateFull() {
        const objectId = document.getElementById('config-update-objectid').value;
        const name = document.getElementById('config-update-name').value.trim();
        const version = document.getElementById('config-update-version').value;
        const description = document.getElementById('config-update-desc').value.trim();
        const category = document.getElementById('config-update-category').value;
        const processors = document.getElementById('config-update-processors').value.trim();
        const tags = document.getElementById('config-update-tags').value.trim();
        const content = document.getElementById('config-update-content').value.trim();
        const changeLog = document.getElementById('config-update-changelog').value.trim();
        if (!name) { this.showToast('请输入配置名称'); return; }
        if (!description) { this.showToast('请输入配置描述'); return; }
        if (!processors) { this.showToast('请输入适配处理器'); return; }
        if (!tags) { this.showToast('请输入标签'); return; }
        if (!content) { this.showToast('请输入规则内容'); return; }
        if (!changeLog) { this.showToast('请填写修改说明'); return; }
        let versionStr = String(version).replace(/。/g, '.').replace(/[^\d.]/g, '');
        let newVersion = parseFloat(versionStr) || 1;
        newVersion = Math.round((newVersion + 0.1) * 10) / 10;
        document.getElementById('config-update-form').classList.add('hidden');
        document.getElementById('config-update-progress').classList.add('show');
        document.getElementById('config-update-status').textContent = '正在更新配置...';
        const updateData = {
            name, version: newVersion, description, category,
            processors: processors.split(/\s+/).filter(p => p),
            tags: tags.split(/\s+/).filter(t => t),
            content
        };
        const result = await this.cloud.updateConfigDirect(objectId, updateData, changeLog);
        document.getElementById('config-update-modal').classList.remove('show');
        document.getElementById('config-update-form').classList.remove('hidden');
        document.getElementById('config-update-progress').classList.remove('show');
        this.showToast(result.message);
        if (result.success) {
            this.cloud.configsCache = null;
            this.myConfigsCache = null;
            await this.addCloudLog('更新', `${name} v${newVersion}`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.stellarApp = new StellarCoreAppOpt();
    initDeviceRegistration();
});

function initDeviceRegistration() {
    const toast = (msg) => window.stellarApp?.showToast(msg);
    const registerModal = document.getElementById('device-register-modal');
    const chooseModal = document.getElementById('device-choose-modal');
    const recoverModal = document.getElementById('device-recover-modal');
    const accountModal = document.getElementById('account-modal');
    const recoveryVerifyModal = document.getElementById('recovery-verify-modal');
    if (!registerModal || !chooseModal || !recoverModal) return;
    const copyBtn = document.getElementById('copy-recovery-code');
    const registerDoneBtn = document.getElementById('register-done');
    const chooseNewBtn = document.getElementById('choose-new');
    const chooseRecoverBtn = document.getElementById('choose-recover');
    const recoverCancelBtn = document.getElementById('recover-cancel');
    const recoverDoneBtn = document.getElementById('recover-done');
    const recoveryCodeDisplay = document.getElementById('recovery-code-display');
    const registerNicknameInput = document.getElementById('register-nickname');
    const registerPasswordInput = document.getElementById('register-password');
    const recoverInput = document.getElementById('recover-input');
    let pendingRecoveryCode = null;
    let isCheckingNickname = false;
    async function checkAndShowRegistration() {
        if (!window.stellarApp || !window.stellarApp.cloud) {
            setTimeout(checkAndShowRegistration, 100);
            return;
        }
        const status = await window.stellarApp.cloud.checkDeviceStatus();
        if (status.status === 'new') {
            chooseModal.classList.add('show');
        }
    }
    setTimeout(checkAndShowRegistration, 500);
    chooseNewBtn.addEventListener('click', () => {
        chooseModal.classList.remove('show');
        registerModal.classList.add('show');
        // 清除恢复模式标记
        registerModal.dataset.isRecovery = '';
        registerModal.dataset.recoveredNickname = '';
        registerModal.dataset.passwordSet = '';
        recoveryCodeDisplay.textContent = '填写信息后生成';
        if (registerNicknameInput) {
            registerNicknameInput.value = '';
            registerNicknameInput.readOnly = false;
            registerNicknameInput.style.backgroundColor = '';
        }
        if (registerPasswordInput) registerPasswordInput.value = '';
    });
    chooseRecoverBtn.addEventListener('click', () => {
        chooseModal.classList.remove('show');
        recoverModal.classList.add('show');
    });
    recoverCancelBtn.addEventListener('click', () => {
        recoverModal.classList.remove('show');
        chooseModal.classList.add('show');
    });
    copyBtn.addEventListener('click', () => {
        if (pendingRecoveryCode) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(pendingRecoveryCode);
            }
            toast('已复制恢复码');
        }
    });
    if (registerNicknameInput) {
        registerNicknameInput.addEventListener('blur', async () => {
            const nickname = registerNicknameInput.value.trim();
            if (!nickname || nickname.length < 1) return;
            if (isCheckingNickname) return;
            isCheckingNickname = true;
            const result = await window.stellarApp.cloud.checkNickname(nickname);
            isCheckingNickname = false;
            if (!result.available) {
                toast(result.message || '昵称不可用');
            }
        });
    }
    registerDoneBtn.addEventListener('click', async () => {
        const nickname = registerNicknameInput?.value.trim();
        const password = registerPasswordInput?.value.trim();
        const isRecovery = registerModal.dataset.isRecovery === '1';
        
        if (!nickname || nickname.length < 1) {
            toast('请输入昵称(1-10字)');
            return;
        }
        if (nickname.length > 10) {
            toast('昵称最多10个字');
            return;
        }
        if (!/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(nickname)) {
            toast('昵称只能包含中英文和数字');
            return;
        }
        if (!password || password.length < 4) {
            toast('请设置管理密码(至少4位)');
            return;
        }
        
        // 恢复模式：只需要设置新密码
        if (isRecovery) {
            recoveryCodeDisplay.textContent = '设置中...';
            try {
                const { deviceId, deviceSecret } = await window.stellarApp.cloud.ensureRegistered();
                const timestamp = Date.now();
                const sign = window.stellarApp.cloud.generateSign(deviceId, timestamp, deviceSecret);
                const result = await window.stellarApp.cloud.callCloudFunction('setPassword', {
                    deviceId, timestamp, sign, password
                });
                if (result && result.success) {
                    registerModal.dataset.isRecovery = '';
                    registerModal.dataset.passwordSet = '1';
                    registerModal.classList.remove('show');
                    toast('密码设置成功');
                } else {
                    recoveryCodeDisplay.textContent = pendingRecoveryCode || '----';
                    toast(result?.message || '设置密码失败');
                }
            } catch (e) {
                recoveryCodeDisplay.textContent = pendingRecoveryCode || '----';
                toast('设置失败: ' + (e.message || '请检查网络'));
            }
            return;
        }
        
        // 新注册模式
        recoveryCodeDisplay.textContent = '注册中...';
        const checkResult = await window.stellarApp.cloud.checkNickname(nickname);
        if (!checkResult.available) {
            recoveryCodeDisplay.textContent = '注册失败';
            toast(checkResult.message || '昵称不可用');
            return;
        }
        const result = await window.stellarApp.cloud.registerWithPassword(nickname, password);
        if (result.success && result.isNew) {
            pendingRecoveryCode = result.recoveryCode;
            recoveryCodeDisplay.textContent = result.recoveryCode;
            registerDoneBtn.textContent = '完成';
            registerDoneBtn.onclick = () => {
                registerModal.classList.remove('show');
                toast('注册完成');
            };
            toast('注册成功，请保存恢复码');
        } else if (result.success && !result.isNew) {
            registerModal.classList.remove('show');
            toast('设备已注册');
        } else {
            recoveryCodeDisplay.textContent = '注册失败';
            toast(result.message || '注册失败');
        }
    });
    recoverDoneBtn.addEventListener('click', async () => {
        const credential = recoverInput.value.trim();
        if (!credential) {
            toast('请输入恢复码或密码');
            return;
        }
        toast('找回中...');
        const result = await window.stellarApp.cloud.recoverDevice(credential);
        if (result.success) {
            recoverModal.classList.remove('show');
            recoverInput.value = '';
            // 恢复成功，标记为恢复模式，清除密码设置标记
            registerModal.dataset.isRecovery = '1';
            registerModal.dataset.recoveredNickname = result.nickname || '';
            registerModal.dataset.passwordSet = '';
            pendingRecoveryCode = result.recoveryCode;
            recoveryCodeDisplay.textContent = result.recoveryCode || '----';
            if (registerNicknameInput && result.nickname) {
                registerNicknameInput.value = result.nickname;
                registerNicknameInput.readOnly = true;
                registerNicknameInput.style.backgroundColor = 'rgba(128,128,128,0.1)';
            }
            if (registerPasswordInput) registerPasswordInput.value = '';
            registerModal.classList.add('show');
            toast('账户已找回，请设置新密码并保存恢复码');
        } else {
            toast(result.message || '找回失败');
        }
    });
    if (accountModal) {
        const accountCloseBtn = document.getElementById('account-close');
        if (accountCloseBtn) {
            accountCloseBtn.addEventListener('click', () => {
                accountModal.classList.remove('show');
            });
        }
    }
    if (recoveryVerifyModal) {
        const verifyCloseBtn = document.getElementById('recovery-verify-cancel');
        const verifyDoneBtn = document.getElementById('recovery-verify-done');
        if (verifyCloseBtn) {
            verifyCloseBtn.addEventListener('click', () => {
                recoveryVerifyModal.classList.remove('show');
            });
        }
        if (verifyDoneBtn) {
            verifyDoneBtn.addEventListener('click', () => {
                window.stellarApp.verifyAndShowRecovery();
            });
        }
    }
}

function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (!themeToggle) {
        console.warn('Theme toggle button not found');
        return;
    }
    
    // 从localStorage读取保存的主题设置
    const savedTheme = localStorage.getItem('starchaser-theme');
    
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    } else {
        // 未设置时跟随系统主题
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            body.classList.add('dark-mode');
        }
    }
    
    // 点击切换主题
    themeToggle.addEventListener('click', () => {
        // 禁用过渡动画避免backdrop-filter卡顿
        body.classList.add('no-transition');
        
        // 切换暗色模式
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        
        // 保存到localStorage
        localStorage.setItem('starchaser-theme', isDark ? 'dark' : 'light');
        
        // 延迟恢复过渡动画
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                body.classList.remove('no-transition');
            });
        });
        
        // 按钮动画效果
        themeToggle.style.transform = 'translateY(-50%) scale(0.85)';
        setTimeout(() => {
            themeToggle.style.transform = 'translateY(-50%) scale(1)';
        }, 150);
        
        // 可选：显示提示
        if (typeof showToast === 'function') {
            showToast(isDark ? '已切换到暗色模式' : '已切换到亮色模式');
        }
    });
    
    // 监听系统主题变化（仅在用户未手动设置时响应）
    if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleSystemThemeChange = (e) => {
            // 仅在用户未手动设置主题时跟随系统
            const savedTheme = localStorage.getItem('starchaser-theme');
            if (!savedTheme) {
                if (e.matches) {
                    body.classList.add('dark-mode');
                } else {
                    body.classList.remove('dark-mode');
                }
            }
        };
        
        // 兼容新旧API
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleSystemThemeChange);
        }
    }
}

/**
 * 获取当前主题
 * @returns {'light'|'dark'} 当前主题
 */
function getCurrentTheme() {
    return document.body.classList.contains('dark-mode') ? 'dark' : 'light';
}

/**
 * 设置主题
 * @param {'light'|'dark'|'auto'} theme 主题设置
 */
function setTheme(theme) {
    const body = document.body;
    
    if (theme === 'dark') {
        body.classList.add('dark-mode');
        localStorage.setItem('starchaser-theme', 'dark');
    } else if (theme === 'light') {
        body.classList.remove('dark-mode');
        localStorage.setItem('starchaser-theme', 'light');
    } else if (theme === 'auto') {
        localStorage.removeItem('starchaser-theme');
        // 跟随系统
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    }
}

class RulesMetaManager {
    constructor(app) {
        this.app = app;
        this.metaFile = `${app.configDir}/rules_meta.json`;
        this.meta = {
            version: 1,
            cloudConfigs: [],
            deletedApps: [],
            apps: {}
        };
    }

    async load() {
        const content = await this.app.exec(`cat ${this.metaFile} 2>/dev/null`);
        console.log('[Debug] RulesMetaManager.load - metaFile:', this.metaFile, 'content length:', content?.length);
        if (content && content.trim()) {
            try {
                const parsed = JSON.parse(content);
                this.meta = {
                    version: parsed.version || 1,
                    cloudConfigs: parsed.cloudConfigs || [],
                    deletedApps: parsed.deletedApps || [],
                    apps: parsed.apps || {}
                };
                console.log('[Debug] RulesMetaManager.load - parsed apps count:', Object.keys(this.meta.apps).length);
            } catch (e) {
                console.log('[Debug] RulesMetaManager.load - JSON parse error, migrating:', e);
                await this.migrateFromOldFormat();
            }
        } else {
            console.log('[Debug] RulesMetaManager.load - no meta file, migrating from applist.conf');
            await this.migrateFromOldFormat();
        }
    }

    async save() {
        const json = JSON.stringify(this.meta);
        await this.app.exec(`echo '${json.replace(/'/g, "'\\''")}' > ${this.metaFile}`);
        await this.generateApplistConf();
    }

    async migrateFromOldFormat() {
        const oldContent = await this.app.exec(`cat ${this.app.configFile} 2>/dev/null`);
        console.log('[Debug] migrateFromOldFormat - configFile:', this.app.configFile, 'content length:', oldContent?.length);
        if (!oldContent) {
            console.log('[Debug] migrateFromOldFormat - no old content, skip');
            return;
        }

        let currentAppName = '';
        let currentPriority = null;

        oldContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const nameMatch = trimmed.match(/^#\s*@name:(.+)$/);
            if (nameMatch) {
                currentAppName = nameMatch[1].trim();
                return;
            }

            const priorityMatch = trimmed.match(/^#\s*@priority:(.+)$/);
            if (priorityMatch) {
                const parts = priorityMatch[1];
                const niceMatch = parts.match(/nice=([^,]+)/);
                const ioMatch = parts.match(/io=(\d+)-(\d+)/);
                if (niceMatch && ioMatch) {
                    currentPriority = {
                        nice: parseInt(niceMatch[1]),
                        ioClass: parseInt(ioMatch[1]),
                        ioLevel: parseInt(ioMatch[2])
                    };
                }
                return;
            }

            if (trimmed.startsWith('#')) return;

            const rule = this.app.parseRuleLine(trimmed);
            if (rule) {
                if (!this.meta.apps[rule.package]) {
                    this.meta.apps[rule.package] = {
                        appName: currentAppName || '',
                        priority: currentPriority,
                        rules: []
                    };
                }
                this.meta.apps[rule.package].rules.push({
                    type: rule.type,
                    thread: rule.thread,
                    subprocess: rule.subprocess,
                    cpus: rule.cpus,
                    source: { type: 'local', configId: null }
                });
                if (currentAppName && !this.meta.apps[rule.package].appName) {
                    this.meta.apps[rule.package].appName = currentAppName;
                }
                if (currentPriority && !this.meta.apps[rule.package].priority) {
                    this.meta.apps[rule.package].priority = currentPriority;
                }
            }
        });

        console.log('[Debug] migrateFromOldFormat - migrated apps count:', Object.keys(this.meta.apps).length);
        await this.save();
    }

    async generateApplistConf() {
        let lines = [];

        for (const [pkg, appData] of Object.entries(this.meta.apps)) {
            if (appData.appName) {
                lines.push(`# @name:${appData.appName}`);
            }
            if (appData.priority) {
                const p = appData.priority;
                lines.push(`# @priority:nice=${p.nice},io=${p.ioClass}-${p.ioLevel}`);
            }
            for (const rule of appData.rules) {
                if (rule.type === 'main') {
                    lines.push(`${pkg}=${rule.cpus}`);
                } else if (rule.type === 'thread') {
                    lines.push(`${pkg}{${rule.thread}}=${rule.cpus}`);
                } else if (rule.type === 'subprocess') {
                    lines.push(`${pkg}:${rule.subprocess}=${rule.cpus}`);
                } else if (rule.type === 'subprocess_thread') {
                    lines.push(`${pkg}:${rule.subprocess}{${rule.thread}}=${rule.cpus}`);
                }
            }
            lines.push('');
        }

        const content = lines.join('\n');
        await this.app.exec(`echo '${content.replace(/'/g, "'\\''")}' > ${this.app.configFile}`);
    }

    addCloudConfig(config) {
        const exists = this.meta.cloudConfigs.find(c => c.id === config.id);
        if (!exists) {
            this.meta.cloudConfigs.push({
                id: config.id,
                name: config.name,
                version: config.version,
                author: config.author,
                downloadedAt: new Date().toISOString()
            });
        } else {
            exists.version = config.version;
            exists.downloadedAt = new Date().toISOString();
        }
    }

    updateCloudConfigVersion(configId, newVersion) {
        const config = this.meta.cloudConfigs.find(c => c.id === configId);
        if (config) {
            config.version = newVersion;
            config.downloadedAt = new Date().toISOString();
        }
    }

    addDeletedApp(pkg, configId) {
        const exists = this.meta.deletedApps.find(d => d.package === pkg && d.fromConfigId === configId);
        if (!exists) {
            this.meta.deletedApps.push({
                package: pkg,
                fromConfigId: configId,
                deletedAt: new Date().toISOString()
            });
        }
    }

    removeDeletedApp(pkg, configId) {
        this.meta.deletedApps = this.meta.deletedApps.filter(
            d => !(d.package === pkg && d.fromConfigId === configId)
        );
    }

    isAppDeleted(pkg, configId) {
        return this.meta.deletedApps.some(d => d.package === pkg && d.fromConfigId === configId);
    }

    getAppsByConfigId(configId) {
        const apps = [];
        for (const [pkg, appData] of Object.entries(this.meta.apps)) {
            const hasRulesFromConfig = appData.rules.some(r => r.source.configId === configId);
            if (hasRulesFromConfig) {
                apps.push(pkg);
            }
        }
        return apps;
    }

    removeRulesByConfigId(configId) {
        for (const [pkg, appData] of Object.entries(this.meta.apps)) {
            appData.rules = appData.rules.filter(r => r.source.configId !== configId);
            if (appData.rules.length === 0) {
                delete this.meta.apps[pkg];
            }
        }
    }

    hasCloudConfigs() {
        return this.meta.cloudConfigs.length > 0;
    }

    getBaseConfigsForUpload() {
        return this.meta.cloudConfigs.map(c => ({
            id: c.id,
            name: c.name,
            version: c.version
        }));
    }
}

const IOSchedulerManager = {
    state: {
        scheduler: '',
        readahead: 128,
        availableSchedulers: []
    },

    async init(app) {
        this.app = app;
        await this.load();
        this.bindEvents();
    },

    async load() {
        const schedulerRaw = await this.app.exec(
            'cat /sys/block/sda/queue/scheduler 2>/dev/null || ' +
            'cat /sys/block/mmcblk0/queue/scheduler 2>/dev/null'
        );

        const match = schedulerRaw.match(/\[([^\]]+)\]/);
        if (match) this.state.scheduler = match[1].trim();

        this.state.availableSchedulers = schedulerRaw
            .replace(/\[|\]/g, '')
            .split(/\s+/)
            .filter(s => s.trim())
            .map(s => s.trim());

        const readahead = await this.app.exec(
            'cat /sys/block/sda/queue/read_ahead_kb 2>/dev/null || ' +
            'cat /sys/block/mmcblk0/queue/read_ahead_kb 2>/dev/null'
        );
        this.state.readahead = parseInt(readahead.trim()) || 128;

        const savedConfig = await this.app.exec(`cat ${this.app.configDir}/io_scheduler.conf 2>/dev/null`);
        if (savedConfig) {
            const savedScheduler = savedConfig.match(/scheduler=([^\s\n]+)/);
            const savedReadahead = savedConfig.match(/readahead=(\d+)/);
            if (savedScheduler) this.state.scheduler = savedScheduler[1].trim();
            if (savedReadahead) this.state.readahead = parseInt(savedReadahead[1]);
        }

        this.render();
    },

    render() {
        const schedulerValue = document.getElementById('perf-scheduler-value');
        if (schedulerValue) schedulerValue.textContent = this.state.scheduler || '-';

        const schedulerContainer = document.getElementById('default-scheduler-options');
        if (schedulerContainer) {
            schedulerContainer.innerHTML = this.state.availableSchedulers.map(s =>
                `<div class="option-item ${s === this.state.scheduler ? 'selected' : ''}" data-value="${s}">${s}</div>`
            ).join('');
        }

        const readaheadValue = document.getElementById('perf-readahead-value');
        if (readaheadValue) readaheadValue.textContent = this.state.readahead ? `${this.state.readahead}KB` : '-';

        const sizes = [128, 256, 512, 1024, 2048];
        const readaheadContainer = document.getElementById('default-readahead-options');
        if (readaheadContainer) {
            readaheadContainer.innerHTML = sizes.map(s =>
                `<div class="option-item ${s === this.state.readahead ? 'selected' : ''}" data-value="${s}">${s}KB</div>`
            ).join('');
        }
    },

    bindEvents() {
        const schedulerExpand = document.getElementById('perf-scheduler-expand');
        if (schedulerExpand) {
            const header = schedulerExpand.querySelector('.perf-expand-header');
            if (header) header.addEventListener('click', () => schedulerExpand.classList.toggle('expanded'));
        }

        const readaheadExpand = document.getElementById('perf-readahead-expand');
        if (readaheadExpand) {
            const header = readaheadExpand.querySelector('.perf-expand-header');
            if (header) header.addEventListener('click', () => readaheadExpand.classList.toggle('expanded'));
        }

        const schedulerContainer = document.getElementById('default-scheduler-options');
        if (schedulerContainer) {
            schedulerContainer.addEventListener('click', async (e) => {
                const item = e.target.closest('.option-item');
                if (!item) return;
                schedulerContainer.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                await this.applyScheduler(item.dataset.value);
            });
        }

        const readaheadContainer = document.getElementById('default-readahead-options');
        if (readaheadContainer) {
            readaheadContainer.addEventListener('click', async (e) => {
                const item = e.target.closest('.option-item');
                if (!item) return;
                readaheadContainer.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                await this.applyReadahead(parseInt(item.dataset.value));
            });
        }
    },

    async applyScheduler(scheduler) {
        this.state.scheduler = scheduler;
        await this.app.exec(`
            for f in /sys/block/*/queue/scheduler; do
                echo "${scheduler}" > "$f" 2>/dev/null
            done
        `);
        await this.saveConfig();
        const v = document.getElementById('perf-scheduler-value');
        if (v) v.textContent = scheduler;
        this.app.showToast(`IO调度器: ${scheduler}`);
    },

    async applyReadahead(size) {
        this.state.readahead = size;
        await this.app.exec(`
            for f in /sys/block/*/queue/read_ahead_kb; do
                echo "${size}" > "$f" 2>/dev/null
            done
        `);
        await this.saveConfig();
        const v = document.getElementById('perf-readahead-value');
        if (v) v.textContent = `${size}KB`;
        this.app.showToast(`预读取: ${size}KB`);
    },

    async saveConfig() {
        const content = `scheduler=${this.state.scheduler}\nreadahead=${this.state.readahead}`;
        await this.app.exec(`echo '${content}' > ${this.app.configDir}/io_scheduler.conf`);
    }
};

const PriorityManager = {
    currentPackage: null,
    currentPriority: { nice: 0, ioClass: 2, ioLevel: 4 },

    init(app) {
        this.app = app;
        this.bindEvents();
    },

    bindEvents() {
        const niceSlider = document.getElementById('nice-slider');
        const niceValue = document.getElementById('nice-value');
        if (niceSlider && niceValue) {
            niceSlider.addEventListener('input', () => {
                this.currentPriority.nice = parseInt(niceSlider.value);
                niceValue.textContent = this.currentPriority.nice;
            });
        }

        const ioOptions = document.getElementById('io-options');
        if (ioOptions) {
            ioOptions.addEventListener('click', (e) => {
                const option = e.target.closest('.io-option');
                if (!option) return;
                ioOptions.querySelectorAll('.io-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.currentPriority.ioClass = parseInt(option.dataset.class);
                this.currentPriority.ioLevel = parseInt(option.dataset.level);
            });
        }

        document.getElementById('priority-cancel')?.addEventListener('click', () => {
            document.getElementById('priority-modal').classList.remove('show');
        });

        document.getElementById('priority-done')?.addEventListener('click', () => {
            this.savePriority();
        });
    },

    show(pkg, appName, currentPriority) {
        this.currentPackage = pkg;
        this.currentPriority = currentPriority || { nice: 0, ioClass: 2, ioLevel: 4 };

        const appInfo = document.getElementById('priority-app-info');
        if (appInfo) {
            appInfo.innerHTML = `<div style="font-size:16px;">${appName || pkg}</div><div style="font-size:12px;color:#8E8E93;margin-top:4px;">${pkg}</div>`;
        }

        const niceSlider = document.getElementById('nice-slider');
        const niceValue = document.getElementById('nice-value');
        if (niceSlider && niceValue) {
            niceSlider.value = this.currentPriority.nice;
            niceValue.textContent = this.currentPriority.nice;
        }

        const ioOptions = document.getElementById('io-options');
        if (ioOptions) {
            ioOptions.querySelectorAll('.io-option').forEach(o => {
                const ioClass = parseInt(o.dataset.class);
                o.classList.toggle('selected', ioClass === this.currentPriority.ioClass);
            });
        }

        document.getElementById('priority-modal').classList.add('show');
    },

    async savePriority() {
        if (!this.currentPackage) return;

        const meta = this.app.rulesMeta.meta;
        if (meta.apps[this.currentPackage]) {
            meta.apps[this.currentPackage].priority = { ...this.currentPriority };
            await this.app.rulesMeta.save();
            await this.applyPriorityToProcess(this.currentPackage, this.currentPriority);
            this.app.renderRules();
            this.app.showToast('优先级已保存');
        }

        document.getElementById('priority-modal').classList.remove('show');
    },

    async applyPriorityToProcess(pkg, priority) {
        const pids = await this.app.exec(`pgrep -f "${pkg}" 2>/dev/null`);
        if (!pids.trim()) return;

        for (const pid of pids.split('\n').filter(p => p.trim())) {
            await this.app.exec(`renice -n ${priority.nice} -p ${pid} 2>/dev/null`);
            await this.app.exec(`ionice -c ${priority.ioClass} -n ${priority.ioLevel} -p ${pid} 2>/dev/null`);
        }
    }
};

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('starchaser-theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (!savedTheme && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-mode');
        }

        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            document.body.classList.add('no-transition');
            document.body.classList.toggle('dark-mode');
            requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('no-transition')));
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('starchaser-theme', isDark ? 'dark' : 'light');
        });

        window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('starchaser-theme')) {
                document.body.classList.toggle('dark-mode', e.matches);
            }
        });
    }
};

const PerformanceManager = {
    config: {
        interval: 1,
        default: { scheduler: '', readahead: 512, governor: '' },
        apps: {}
    },
    availableSchedulers: [],
    availableGovernors: [],
    searchTerm: '',
    editingPkg: null,

    async init(app) {
        this.app = app;
        this.configFile = `${app.configDir}/app_performance.json`;
        await this.loadAvailable();
        await this.load();
        this.bindEvents();
        this.render();
        this.renderDefaultGovernor();
    },

    async loadAvailable() {
        const schedulerRaw = await this.app.exec(
            'cat /sys/block/sda/queue/scheduler 2>/dev/null || cat /sys/block/mmcblk0/queue/scheduler 2>/dev/null'
        );
        this.availableSchedulers = schedulerRaw.replace(/\[|\]/g, '').split(/\s+/).filter(s => s.trim());
        const match = schedulerRaw.match(/\[([^\]]+)\]/);
        if (match) this.config.default.scheduler = match[1].trim();

        const governorRaw = await this.app.exec(
            'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_available_governors 2>/dev/null'
        );
        this.availableGovernors = governorRaw.split(/\s+/).filter(s => s.trim());
        const currentGov = await this.app.exec(
            'cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null'
        );
        if (currentGov.trim()) this.config.default.governor = currentGov.trim();
    },

    async load() {
        const content = await this.app.exec(`cat ${this.configFile} 2>/dev/null`);
        if (content && content.trim()) {
            try {
                const parsed = JSON.parse(content);
                this.config.interval = parsed.interval || 1;
                this.config.default = parsed.default || this.config.default;
                this.config.apps = parsed.apps || {};
            } catch (e) { /* ignore */ }
        }
        document.getElementById('perf-interval-value').textContent = this.config.interval;
    },

    async save() {
        const json = JSON.stringify(this.config);
        await this.app.exec(`echo '${json.replace(/'/g, "'\\''")}' > ${this.configFile}`);
    },

    renderDefaultGovernor() {
        const governorValue = document.getElementById('perf-governor-value');
        if (governorValue) governorValue.textContent = this.config.default.governor || '-';

        const container = document.getElementById('default-governor-options');
        if (!container) return;
        container.innerHTML = this.availableGovernors.map(g =>
            `<div class="option-item ${g === this.config.default.governor ? 'selected' : ''}" data-value="${g}">${g}</div>`
        ).join('');

        const governorExpand = document.getElementById('perf-governor-expand');
        if (governorExpand) {
            const header = governorExpand.querySelector('.perf-expand-header');
            if (header) header.addEventListener('click', () => governorExpand.classList.toggle('expanded'));
        }

        container.addEventListener('click', async (e) => {
            const item = e.target.closest('.option-item');
            if (!item) return;
            container.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            await this.applyDefaultGovernor(item.dataset.value);
        });
    },

    async applyDefaultGovernor(governor) {
        this.config.default.governor = governor;
        await this.app.exec(`
            for f in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
                echo "${governor}" > "$f" 2>/dev/null
            done
        `);
        await this.save();
        const v = document.getElementById('perf-governor-value');
        if (v) v.textContent = governor;
        this.app.showToast(`CPU调速器: ${governor}`);
    },

    render() {
        const container = document.getElementById('perf-app-container');
        if (!container) return;
        let apps = Object.entries(this.config.apps);
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            apps = apps.filter(([pkg, data]) =>
                pkg.toLowerCase().includes(term) || (data.appName || '').toLowerCase().includes(term)
            );
        }
        if (apps.length === 0) {
            container.innerHTML = '<div class="perf-app-empty">暂无应用专属配置</div>';
            return;
        }
        container.innerHTML = apps.map(([pkg, data]) => {
            const tags = [];
            if (data.disableOiface) tags.push('<span class="perf-tag oiface">禁用oiface</span>');
            if (data.scheduler) tags.push(`<span class="perf-tag scheduler">${data.scheduler}</span>`);
            if (data.readahead) tags.push(`<span class="perf-tag">${data.readahead}KB</span>`);
            if (data.governor) tags.push(`<span class="perf-tag governor">${data.governor}</span>`);
            return `<div class="perf-app-item" data-pkg="${pkg}">
                <div class="perf-app-header">
                    <div class="perf-app-info">
                        <span class="perf-app-name">${data.appName || pkg}</span>
                        ${data.appName ? `<span class="perf-app-pkg">${pkg}</span>` : ''}
                    </div>
                    <div class="perf-app-actions">
                        <span class="perf-app-edit" data-pkg="${pkg}">编辑</span>
                        <span class="perf-app-delete" data-pkg="${pkg}">删除</span>
                    </div>
                </div>
                <div class="perf-app-tags">${tags.join('')}</div>
            </div>`;
        }).join('');
        container.querySelectorAll('.perf-app-edit').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditModal(el.dataset.pkg);
            });
        });
        container.querySelectorAll('.perf-app-delete').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = el.closest('.perf-app-item');
                if (item) item.classList.add('deleting');
                setTimeout(() => this.deleteApp(el.dataset.pkg), 300);
            });
        });
    },

    bindEvents() {
        document.getElementById('add-perf-app')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('perf-app-cancel')?.addEventListener('click', () => {
            document.getElementById('perf-app-modal').classList.remove('show');
        });
        document.getElementById('perf-app-done')?.addEventListener('click', () => this.saveModal());
        document.getElementById('perf-search')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.render();
        });
        document.querySelectorAll('.interval-btn[data-target="perf"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delta = parseInt(e.target.dataset.delta);
                this.adjustInterval(delta);
            });
        });
    },

    adjustInterval(delta) {
        let newVal = this.config.interval + delta;
        if (newVal < 1) newVal = 1;
        if (newVal > 10) newVal = 10;
        this.config.interval = newVal;
        document.getElementById('perf-interval-value').textContent = newVal;
        this.save();
    },

    showAddModal() {
        this.editingPkg = null;
        document.getElementById('perf-app-modal-title').textContent = '添加应用配置';
        document.getElementById('perf-app-select-section').classList.remove('hidden');
        document.getElementById('perf-app-name-display').classList.add('hidden');
        document.getElementById('perf-app-package').value = '';
        document.getElementById('perf-app-oiface').checked = false;
        this.renderAppSelectList();
        this.renderModalOptions();
        document.getElementById('perf-app-modal').classList.add('show');
    },

    showEditModal(pkg) {
        const data = this.config.apps[pkg];
        if (!data) return;
        this.editingPkg = pkg;
        document.getElementById('perf-app-modal-title').textContent = '编辑应用配置';
        document.getElementById('perf-app-select-section').classList.add('hidden');
        document.getElementById('perf-app-name-display').classList.remove('hidden');
        document.getElementById('perf-app-name-display').textContent = data.appName || pkg;
        document.getElementById('perf-app-package').value = pkg;
        document.getElementById('perf-app-oiface').checked = data.disableOiface || false;
        this.renderModalOptions(data);
        document.getElementById('perf-app-modal').classList.add('show');
    },

    renderAppSelectList() {
        const container = document.getElementById('perf-app-select-list');
        const searchInput = document.getElementById('perf-app-select-search');
        if (!container) return;

        const renderList = () => {
            const term = searchInput.value.toLowerCase();
            const apps = Object.entries(this.app.rulesMeta.meta.apps)
                .filter(([pkg]) => !this.config.apps[pkg])
                .filter(([pkg, data]) =>
                    pkg.toLowerCase().includes(term) || (data.appName || '').toLowerCase().includes(term)
                );
            if (apps.length === 0) {
                container.innerHTML = '<div style="padding:12px;color:#8E8E93;text-align:center;">无匹配应用，可直接在搜索框输入包名</div>';
                return;
            }
            container.innerHTML = apps.map(([pkg, data]) =>
                `<div class="perf-app-select-item" data-pkg="${pkg}">
                    <span class="perf-app-select-name">${data.appName || pkg}</span>
                    ${data.appName ? `<span class="perf-app-select-pkg">${pkg}</span>` : ''}
                </div>`
            ).join('');
            container.querySelectorAll('.perf-app-select-item').forEach(item => {
                item.addEventListener('click', () => {
                    container.querySelectorAll('.perf-app-select-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    document.getElementById('perf-app-package').value = item.dataset.pkg;
                    searchInput.value = item.querySelector('.perf-app-select-name').textContent;
                });
            });
        };

        searchInput.value = '';
        searchInput.oninput = renderList;
        renderList();
    },

    renderModalOptions(data = {}) {
        const schedulerContainer = document.getElementById('perf-app-scheduler');
        const readaheadContainer = document.getElementById('perf-app-readahead');
        const governorContainer = document.getElementById('perf-app-governor');
        const defaultSched = data.scheduler || '';
        const defaultRead = data.readahead || 0;
        const defaultGov = data.governor || '';

        schedulerContainer.innerHTML = `<div class="option-item ${!defaultSched ? 'selected' : ''}" data-value="">默认</div>` +
            this.availableSchedulers.map(s =>
                `<div class="option-item ${s === defaultSched ? 'selected' : ''}" data-value="${s}">${s}</div>`
            ).join('');

        const sizes = [128, 256, 512, 1024, 2048, 4096];
        readaheadContainer.innerHTML = `<div class="option-item ${!defaultRead ? 'selected' : ''}" data-value="0">默认</div>` +
            sizes.map(s =>
                `<div class="option-item ${s === defaultRead ? 'selected' : ''}" data-value="${s}">${s}KB</div>`
            ).join('');

        governorContainer.innerHTML = `<div class="option-item ${!defaultGov ? 'selected' : ''}" data-value="">默认</div>` +
            this.availableGovernors.map(g =>
                `<div class="option-item ${g === defaultGov ? 'selected' : ''}" data-value="${g}">${g}</div>`
            ).join('');

        [schedulerContainer, readaheadContainer, governorContainer].forEach(c => {
            c.querySelectorAll('.option-item').forEach(item => {
                item.addEventListener('click', () => {
                    c.querySelectorAll('.option-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                });
            });
        });
    },

    async saveModal() {
        let pkg = document.getElementById('perf-app-package').value.trim();
        if (!pkg) {
            pkg = document.getElementById('perf-app-select-search').value.trim();
        }
        if (!pkg) {
            this.app.showToast('请选择或输入应用包名');
            return;
        }
        const disableOiface = document.getElementById('perf-app-oiface').checked;
        const scheduler = document.querySelector('#perf-app-scheduler .option-item.selected')?.dataset.value || '';
        const readahead = parseInt(document.querySelector('#perf-app-readahead .option-item.selected')?.dataset.value) || 0;
        const governor = document.querySelector('#perf-app-governor .option-item.selected')?.dataset.value || '';

        const appData = this.app.rulesMeta.meta.apps[pkg];
        const appName = appData?.appName || '';

        this.config.apps[pkg] = { appName, disableOiface, scheduler, readahead, governor };
        await this.save();
        this.render();
        document.getElementById('perf-app-modal').classList.remove('show');
        this.app.showToast('配置已保存');
    },

    async deleteApp(pkg) {
        delete this.config.apps[pkg];
        await this.save();
        this.render();
        this.app.showToast('已删除');
    },

    oifaceSmartEnabled: false,

    updateOifaceDisabled(smartEnabled) {
        this.oifaceSmartEnabled = smartEnabled;
        const oifaceCheckbox = document.getElementById('perf-app-oiface');
        const oifaceRow = oifaceCheckbox?.closest('.perf-option-row');
        if (oifaceRow) {
            if (smartEnabled) {
                oifaceRow.classList.add('disabled');
                oifaceCheckbox.disabled = true;
            } else {
                oifaceRow.classList.remove('disabled');
                oifaceCheckbox.disabled = false;
            }
        }
    }
};

function renderConfigSourceList(meta) {
    const list = document.getElementById('config-source-list');
    const checkBtn = document.getElementById('check-update-btn');
    if (!list) return;
    const appCount = Object.keys(meta.apps).length;
    const hasCloudConfigs = meta.cloudConfigs.length > 0;
    const hasLocalRules = Object.values(meta.apps).some(app =>
        app.rules && app.rules.some(r => r.source?.type === 'local')
    );
    if (checkBtn) {
        checkBtn.style.display = hasCloudConfigs ? '' : 'none';
    }
    if (appCount === 0) {
        list.innerHTML = '<div class="config-source-item empty">暂无配置</div>';
        return;
    }
    let html = '';
    for (const config of meta.cloudConfigs) {
        html += `<div class="config-source-item cloud">${escapeHtml(config.name)} v${config.version} · by ${escapeHtml(config.author)}</div>`;
    }
    if (hasLocalRules) {
        html += '<div class="config-source-item local">本地配置</div>';
    }
    list.innerHTML = html;
}

async function checkCloudUpdates(app) {
    const meta = app.rulesMeta.meta;
    if (meta.cloudConfigs.length === 0) {
        app.showToast('暂无云端配置');
        return;
    }

    document.getElementById('check-update-modal').classList.add('show');
    const body = document.getElementById('check-update-body');
    body.innerHTML = '<div class="cloud-loading">检查中...</div>';

    const updates = [];
    const deletedToRestore = [];

    for (const config of meta.cloudConfigs) {
        const detail = await app.cloud.fetchConfigDetail(config.id);
        if (!detail) continue;

        const hasUpdate = detail.version > config.version;
        updates.push({
            config,
            latest: detail,
            hasUpdate
        });

        if (hasUpdate) {
            const newApps = app.parseConfigApps(detail.content);
            for (const newApp of newApps) {
                if (meta.deletedApps.some(d => d.package === newApp.package && d.fromConfigId === config.id)) {
                    deletedToRestore.push({
                        package: newApp.package,
                        appName: newApp.appName,
                        configId: config.id,
                        configName: config.name
                    });
                }
            }
        }
    }

    let html = '';
    for (const item of updates) {
        const versionText = item.hasUpdate
            ? `v${item.config.version} → v${item.latest.version}`
            : `v${item.config.version} (已是最新)`;
        const versionClass = item.hasUpdate ? '' : 'no-update';

        html += `<div class="update-config-item" data-id="${item.config.id}">
            <div class="update-config-header">
                <div class="update-config-name">☁️ ${escapeHtml(item.config.name)}</div>
                <div class="update-config-version ${versionClass}">${versionText}</div>
            </div>
            ${item.hasUpdate ? `<div class="update-config-checkbox checked" data-id="${item.config.id}"></div>` : ''}
        </div>`;
    }

    if (deletedToRestore.length > 0) {
        html += `<div class="deleted-apps-section">
            <div class="deleted-apps-title">⚠️ 以下应用你曾手动删除，是否恢复？</div>`;
        for (const app of deletedToRestore) {
            html += `<div class="deleted-app-item" data-pkg="${app.package}" data-config="${app.configId}">
                <div class="deleted-app-checkbox"></div>
                <div class="deleted-app-info">${app.appName || app.package} (来自「${app.configName}」)</div>
            </div>`;
        }
        html += '</div>';
    }

    body.innerHTML = html || '<div style="text-align:center;padding:40px;color:#8E8E93;">所有配置已是最新</div>';
}

function detectConflicts(existingApps, newApps, newConfigId, cloudConfigs) {
    const conflicts = [];
    const configNameMap = {};
    if (cloudConfigs) {
        cloudConfigs.forEach(c => configNameMap[c.id] = c.name);
    }

    for (const newApp of newApps) {
        const existing = existingApps[newApp.package];
        if (!existing) continue;

        const cloudSources = existing.rules
            .filter(r => r.source.type === 'cloud' && r.source.configId !== newConfigId)
            .map(r => configNameMap[r.source.configId] || '未知配置');

        const hasLocalRules = existing.rules.some(r => r.source.type === 'local');

        if (cloudSources.length > 0 || hasLocalRules) {
            conflicts.push({
                package: newApp.package,
                appName: existing.appName || newApp.appName || newApp.package,
                existingCloudConfigs: [...new Set(cloudSources)],
                hasLocalRules: hasLocalRules
            });
        }
    }

    return conflicts;
}
