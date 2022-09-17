const Key = {
    // bindings for ctrl+KEY
    ctrl: {
                   a: '\x01', b: '\x02', c: '\x03', 
        d: '\x04', 
                              
        l: '\x0c',            n: '\x0e', o: '\x0f', 
                              r: '\x12', s: '\x13', 
        t: '\x14', u: '\x15', v: '\x16', w: '\x17', 
        x: '\x18', y: '\x19', z: '\x1a',
    },

    a: 'a', b: 'b', c: 'c', d: 'd', e: 'e',
    f: 'f', g: 'g', h: 'h', i: 'i', j: 'j',
    k: 'k', l: 'l', m: 'm', n: 'n', o: 'o',
    p: 'p', q: 'q', r: 'r', s: 's', t: 't',
    u: 'u', v: 'v', w: 'w', x: 'x', y: 'y',
    z: 'z',

    A: 'A', B: 'B', C: 'C', D: 'D', E: 'E',
    F: 'F', G: 'G', H: 'H', I: 'I', J: 'J',
    K: 'K', L: 'L', M: 'M', N: 'N', O: 'O',
    P: 'P', Q: 'Q', R: 'R', S: 'S', T: 'T',
    U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y',
    Z: 'Z',

    // Ctrl+S
    save: '\x13',
    // Ctrl+V
    paste: '\x16',
    // Ctrl+X
    cut: '\x18',
    // Ctrl+C
    copy: '\x03',

    backspace: '\x08',
    delete: '\x1b[3~', del: '\x1b[3~',
    up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C',
    home: '\x1b[1~', end: '\x1b[4~',
    enter: '\r'
}

function getch(raw=false,encoding='utf-8',CtrlC=process.exit,CtrlD=CtrlC) {
    return new Promise(
        r => {
            process.stdin.setRawMode(true);
            process.stdin.ref();
            process.stdin.once( 'data', (d) => {
                if (!raw) {
                         if (d == '\x1b[D') r('\x82');
                    else if (d == '\x1b[C') r('\x81');
                    else if (d == '\x1b[A') r('\x83');
                    else if (d == '\x1b[B') r('\x84');
                    else if (d == '\x1b[1~') r('\x85'); // home
                    else if (d == '\x1b[2~') r('\x86'); // insert
                    else if (d == '\x1b[3~') r('\x87'); // delete
                    else if (d == '\x1b[4~') r('\x88'); // end
                    else if (d == '\x1b[5~') r('\x89'); // pg up
                    else if (d == '\x1b[6~') r('\x8A'); // pg down
                    else if (d == '\x1b')    r('\x1b'); // esc
                    else if (d == '\x08')    r('\x08'); // backspace
                    else if (d == '\x03' && CtrlC) CtrlC();
                    else if (d == '\x04' && CtrlD) CtrlD();
                    else r(encoding?d.toString(encoding):d);
                } else {
                         if (d == '\x03' && CtrlC) r(CtrlC());
                    else if (d == '\x04' && CtrlD) CtrlD();
                    else r(encoding?d.toString(encoding):d);
                }
                process.stdin.setRawMode(false);
                process.stdin.unref();
            });
        }
    );
}

/*function input(prompt,encoding='utf-8') {
    if (prompt) process.stdout.write(prompt)
    let d = Buffer.alloc(1024);
    process.stdin.setRawMode(false);
    process.stdin.read();
    process.stdin.resume();
    return new Promise(
        r => {
            fs.read(0,d,0,d.length,null,(e,length)=>{
                d = d.subarray(0,length-2);
                r(encoding?d.toString(encoding):d);
            });
        }
    );
}*/

async function input(prompt,settings) {
    let st = {
        'onAbort': ()=>{process.exit()},
    };
    Object.assign(st,settings);
    settings = st;
    process.stdout.write(prompt);
    let value = '';
    let cur = 0;
    while (true) {
        let chr = await getch(true,null,settings.onAbort);
        if (chr == undefined) return chr;
        if (chr == Key.backspace) {
            let l1 = value.length;
            value = value.slice(0,cur-1) + value.slice(cur);
            let diff = l1 - value.length;
            process.stdout.write((cur?`\x1b[${cur}D`:``)+value+' '+(value.length-(cur-diff)+1?`\x1b[${value.length-(cur-diff)+1}D`:``));
            cur -= diff;
        } else
        if (chr == Key.delete) {
            value = value.slice(0,cur) + value.slice(cur+1);
            process.stdout.write((cur?`\x1b[${cur}D`:``)+value+' '+(value.length-cur+1?`\x1b[${value.length-cur+1}D`:``));
        } else
        if (chr == '\r') {
            console.log();
            return value;
        } else
        if (chr == Key.left) {
            let diff = cur - Math.max(0,cur-1);
            cur -= diff;
            if (diff>0) process.stdout.write(`\x1b[${diff}D`);
        } else
        if (chr == Key.right) {
            let diff =  Math.min(value.length,cur+1) - cur;
            cur += diff;
            if (diff>0) process.stdout.write(`\x1b[${diff}C`);
        } else 
        if (chr == Key.home) {
            process.stdout.write(`\x1b[${cur}D`);
            cur = 0;
        } else
        if (chr == Key.end) {
            process.stdout.write(`\x1b[${value.length-cur}C`);
            cur = value.length-1;
        } else if (chr.length && !Object.values(Key.ctrl).includes(chr) && chr.indexOf('\x1b')==-1) {
            value = value.slice(0,cur) + chr + value.slice(cur);
            process.stdout.write((cur?`\x1b[${cur}D`:``)+value+(value.length-(cur+1)?`\x1b[${value.length-(cur+1)}D`:``));
            cur += 1;
        }
    }
}

module.exports = {getch,input,Key};