const { parentPort } = require('worker_threads');

let memory   = Buffer.alloc(0),
    ARCH     = {},
    ping     = false,
    tvramptr = 0,
    ptr      = 0,
    width    = 0,
    height   = 0,
    run      = false;

const chr = (char) => {
    if (!char.match(/[ -~\0\n]/))
        char = '?'
    if (!'\0'.includes(char))
        return char;
    return ' ';
}
    

let styles = {
    //    foreground colors         background colors
    0x00: '38;2;0;0;0',       0x10: '48;2;0;0;0',
    0x01: '38;2;255;255;255', 0x11: '48;2;255;255;255',
    0x02: '38;2;140;62;52',   0x12: '48;2;140;62;52',
    0x03: '38;2;122;191;199', 0x13: '48;2;222;191;199',
    0x04: '38;2;141;71;179',  0x14: '48;2;141;71;179',
    0x05: '38;2;104;169;65',  0x15: '48;2;104;169;65',
    0x06: '38;2;62;49;162',   0x16: '48;2;62;49;162',
    0x07: '38;2;208;220;113', 0x17: '48;2;208;220;113',
    0x08: '38;2;144;95;37',   0x18: '48;2;144;95;37',
    0x09: '38;2;87;66;0',     0x19: '48;2;87;66;0',
    0x0A: '38;2;187;119;109', 0x1A: '48;2;187;119;109',
    0x0B: '38;2;84;84;84',    0x1B: '48;2;84;84;84',
    0x0C: '38;2;128;128;128', 0x1C: '48;2;128;128;128',
    0x0D: '38;2;172;234;136', 0x1D: '48;2;172;234;136',
    0x0E: '38;2;127;112;218', 0x1E: '48;2;127;112;218',
    0x0F: '38;2;171;171;171', 0x1F: '48;2;171;71;171',

    fg_black:      '38;2;0;0;0',       bg_black:      '48;2;0;0;0',
    fg_white:      '38;2;255;255;255', bg_white:      '48;2;255;255;255',
    fg_red:        '38;2;140;62;52',   bg_red:        '48;2;140;62;52',
    fg_cyan:       '38;2;122;191;199', bg_cyan:       '48;2;222;191;199',
    fg_violet:     '38;2;141;71;179',  bg_violet:     '48;2;141;71;179',
    fg_purple:     '38;2;141;71;179',  bg_purple:     '48;2;141;71;179',
    fg_green:      '38;2;104;169;65',  bg_green:      '48;2;104;169;65',
    fg_blue:       '38;2;62;49;162',   bg_blue:       '48;2;62;49;162',
    fg_yellow:     '38;2;208;220;113', bg_yellow:     '48;2;208;220;113',
    fg_orange:     '38;2;144;95;37',   bg_orange:     '48;2;144;95;37',
    fg_brown:      '38;2;87;66;0',     bg_brown:      '48;2;87;66;0',
    fg_lightRed:   '38;2;187;119;109', bg_lightRed:   '48;2;187;119;109',
    fg_darkGray:   '38;2;84;84;84',    bg_darkGray:   '48;2;84;84;84',
    fg_darkGrey:   '38;2;84;84;84',    bg_darkGrey:   '48;2;84;84;84',
    fg_gray1:      '38;2;84;84;84',    bg_gray1:      '48;2;84;84;84',
    fg_grey1:      '38;2;84;84;84',    bg_grey1:      '48;2;84;84;84',
    fg_gray2:      '38;2;128;128;128', bg_gray2:      '48;2;128;128;128',
    fg_grey2:      '38;2;128;128;128', bg_grey2:      '48;2;128;128;128',
    fg_gray:       '38;2;128;128;128', bg_gray:       '48;2;128;128;128',
    fg_grey:       '38;2;128;128;128', bg_grey:       '48;2;128;128;128',
    fg_lightGreen: '38;2;172;234;136', bg_lightGreen: '48;2;172;234;136',
    fg_lightBlue:  '38;2;127;112;218', bg_lightBlue:  '48;2;127;112;218',
    fg_lightGray:  '38;2;171;171;171', bg_lightGray:  '48;2;171;71;171',
    fg_lightGrey:  '38;2;171;171;171', bg_lightGrey:  '48;2;171;71;171',
    fg_gray3:      '38;2;171;171;171', bg_gray3:      '48;2;171;71;171',
    fg_grey3:      '38;2;171;171;171', bg_grey3:      '48;2;171;71;171',
}

parentPort.on('message',(dat)=>{
    if (dat == 'KILL') {
        run = false;
        return;
    }
    ({memory,ARCH,ptr,width,height} = dat);
    memory = Buffer.from(memory);
    ping =! ping;
    run = true;
});

console.log('Screen thread started');

const svram = (x,y) => (ARCH.memory_size-(ARCH.columns*ARCH.rows*2)) + (x+y*ARCH.columns);
const pvram = (x,y) => (ARCH.memory_size-(ARCH.columns*ARCH.rows*3)) + (x+y*ARCH.columns);
const tvram = (x,y) => (ARCH.memory_size-ARCH.columns*ARCH.rows)     + (x+y*ARCH.columns);

(async()=>{

    while(!run){ await new Promise(r=>setTimeout(r)); }

    let m = Buffer.from(Array.from(memory));

    while (run) {

        tvramptr = memory.readUint16BE(ARCH.tvramptraddr);

        await new Promise(r=>setTimeout(r));

        let nm = Buffer.from(memory.subarray(pvram(0,0)));

        let _nm = Array(ARCH.columns*ARCH.rows).fill().map( (_,i)=>Buffer.from([(i&0b1111111100000000)>>8,i&0b0000000011111111,nm[i],nm[ARCH.columns*ARCH.rows+i],nm[i+ARCH.columns*ARCH.rows*2]]) );
        let _m  = Array(ARCH.columns*ARCH.rows).fill().map( (_,i)=>Buffer.from([(i&0b1111111100000000)>>8,i&0b0000000011111111, m[i], m[ARCH.columns*ARCH.rows+i], m[i+ARCH.columns*ARCH.rows*2]]) );

        let diff = _nm.filter( (v,i)=>v.toString()!=_m[i].toString() );

        let tt = '';
        for (let d of diff) {
            let i = d.readInt16BE(0);
            let p = d.readInt8(2);
            let vs = d.readInt8(3);
            let t = d.readInt8(4);
            let style = [];
            style.push(styles[vs&0b00001111]);
            style.push(styles[((vs&0b11110000)>>4)|0b10000]);
            let [x,y] = [i%ARCH.columns,Math.floor(i/ARCH.columns)];
            tt += `\x1b[${y+1+Math.floor(height/2-ARCH.rows/2)};${x+1+Math.floor(width/2-ARCH.columns/2)}H\x1b[${style.join(';')}m${chr(String.fromCharCode(t))}`;
        }
        let style = [];
        style.push(styles[memory[svram(0,0)+tvramptr]&0b00001111]);
        style.push(styles[((memory[svram(0,0)+tvramptr]&0b11110000)>>4)|0b10000]);
        let [x,y] = [tvramptr%ARCH.columns,Math.floor(tvramptr/ARCH.columns)];
        process.stdout.write(
            tt+
            `\x1b[${Math.floor(height/2-ARCH.rows/2)+1};${Math.floor(width/2+ARCH.columns/2)+2}H` + `\x1b[${styles.bg_darkGray};${styles.fg_cyan}m${ptr.toString(16).padStart(4,'0').toUpperCase()}`+
            //`\x1b[${Math.floor(height/2-ARCH.rows/2)+1};${Math.floor(width/2-ARCH.columns/2)-2}H` + `\x1b[${ping?styles.bg_darkGray:styles.bg_lightGray};${styles.fg_black}m `+
            `\x1b[${y+1+Math.floor(height/2-ARCH.rows/2)};${x+1+Math.floor(width/2-ARCH.columns/2)}H`);


        m = Buffer.from(memory.subarray(pvram(0,0)));

    }

})();