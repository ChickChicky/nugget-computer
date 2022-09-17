const {
    Worker, isMainThread, parentPort, workerData
} = require('worker_threads');
const fs = require('fs');
const prog = fs.readFileSync('./src.bin',{endoding:'binary'});
var _p = Buffer.alloc(0);
const {input,getch,Key} = require('./input');

const chr = (char) => {
    if (!char.match(/[ -~\0\n]/))
        char = '?'
    if (!'\0'.includes(char))
        return char;
    return ' ';
}

const sleep = (ms) => new Promise(r=>setTimeout(r,ms));

const ARCH = {
    // data
    data_width        : 16,
    memory_size       : 65536,
    instruction_width : 8,

    // graphics
    columns: 40,
    rows:    25,

    // special addresses
    tvramptraddr: 62535
}

/*
TVRAM = Text    VideoRAM : The text displayed on the console
SVRAM = Style   VideoRAM : The style of the text displayed on the console
PVRAM = sPecial VideoRAM : More style info
*/

const svram    = (x,y) => (ARCH.memory_size-(ARCH.columns*ARCH.rows*2)) + (x+y*ARCH.columns);
const in_svram =  (i)  => (ARCH.memory_size-(ARCH.columns*ARCH.rows*2)) < i && !in_pvram(i) && !in_tvram(i);

const pvram    = (x,y) => (ARCH.memory_size-(ARCH.columns*ARCH.rows*3)) + (x+y*ARCH.columns);
const in_pvram =  (i)  => (ARCH.memory_size-(ARCH.columns*ARCH.rows*3)) < i && !in_tvram(i);

const tvram    = (x,y) => (ARCH.memory_size-ARCH.columns*ARCH.rows)     + (x+y*ARCH.columns);
const in_tvram =  (i)  => (ARCH.memory_size-ARCH.columns*ARCH.rows)     < i;

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

var memory     = Buffer.alloc(ARCH.memory_size);
var call_stack = Buffer.alloc(ARCH.memory_size); var csp = 0;
var ptr = 0;
let tvramptr = 0;

let screen = new Worker('./screen_worker.js');

let vramPoll = function() {
    
    screen.postMessage({memory,ARCH,ptr,width:process.stdout.columns,height:process.stdout.rows});

    tvramptr = memory.readUInt16BE(ARCH.tvramptraddr);

}
let vpi = setInterval(vramPoll,10);


let err = (e,msg) => {
    ptr = prog.length;
    _p  = Buffer.from([0x31,0,0,0,0,0,0]);

    let tabl = {
        '\x1b': ' ',
        '\r'  : '\0'
    }
    let _ptr = tvramptr;
    // 2 A
    //memory.set(Buffer.allocUnsafe(ARCH.columns*ARCH.rows).map(()=>0x62),svram(0,0));
    for (let byte of Buffer.from('\n'+e+' '+msg,'ascii').map(c=>Object.keys(tabl).includes(String.fromCharCode(c))?tabl[String.fromCharCode(c)].charCodeAt():c)) {
        if (byte == 10) {
            tvramptr = ARCH.columns*(Math.floor(tvramptr/ARCH.columns)+1);
        } else {
            memory[(tvramptr  )+tvram(0,0)] = byte;
            memory[(tvramptr  )+tvram(0,0)] = byte;
            memory[(tvramptr++)+tvram(0,0)] = byte;
        }
    }
    memory.writeUint16BE(tvramptr,ARCH.tvramptraddr);
    memory.set(Buffer.allocUnsafe(e.length).map(()=>0x6A),svram(0,Math.floor(_ptr/ARCH.columns)+1));
    memory.set(Buffer.allocUnsafe(msg.length).map(()=>0x62),svram(1+e.length,Math.floor(_ptr/ARCH.columns)+1));
}

//let screen = new Worker('./screen_worker.js');
//screen.postMessage({memory,ARCH});

const FLAGS = {
    /** A is a pointer */
    A_ptr : 0b00001,
    /** B is a pointer */
    B_ptr : 0b00100,
    /** A is a memory location to a pointer */
    A_mem : 0b00010,
    /** B is a memory location to a pointer */
    B_mem : 0b01000,
    /** D is a memory location to a pointer */
    D_mem : 0b10000,

    A_flags : 0b00011,
    B_flags : 0b01100,
    D_flags : 0b10000
};


process.stdout.write(`\x1b[${styles.fg_blue}m\x1b[${styles.bg_lightBlue}m\x1b[0;0H\x1b[2J`);

vramPoll();
memory.set(Buffer.allocUnsafe(ARCH.columns*ARCH.rows).map(()=>0x6E),svram(0,0));
vramPoll();

(async()=>{while (true) {

    let [flags,opcode,aa,ab,ba,bb,da,db] = Buffer.concat([prog,_p]).subarray(ptr,ptr+ARCH.instruction_width);

    tvramptr = memory.readUInt16BE(ARCH.tvramptraddr);

    let A = aa*256+ab,
        B = ba*256+bb,
        D = da*256+db;

    if (Number.isNaN(opcode+A+B+D)) {
        //console.log(Array.from(memory));
        err('Halting:','Segmentation Fault');
        //console.log('\n\x1b[m\x1b[31;1mHalting:\x1b[0;31m Segmentation Fault\x1b[m');
        break;
    }
    
    if ( (flags & FLAGS.D_flags) == FLAGS.D_mem ) D = memory[D]*256+memory[D+1];
    if ( (flags & FLAGS.A_flags) == FLAGS.A_ptr ) A = memory[A]*256+memory[A+1];
    if ( (flags & FLAGS.A_flags) == FLAGS.A_mem ) A = memory[memory[A]*256+memory[A+1]]*256+memory[memory[A]*256+memory[A+1]+1];
    if ( (flags & FLAGS.B_flags) == FLAGS.B_ptr ) B = memory[A]*256+memory[A+1];
    if ( (flags & FLAGS.B_flags) == FLAGS.B_mem ) B = memory[memory[B]*256+memory[B+1]]*256+memory[memory[B]*256+memory[B+1]+1];

    /*console.log(
        (opcode&0b111111).toString(16).toUpperCase().padStart(2,'0'),
        A.toString(16).toUpperCase().padStart(2,'0'),
        B.toString(16).toUpperCase().padStart(2,'0'),
        D.toString(16).toUpperCase().padStart(2,'0'),
    )*/

    if ( ((opcode & 0b00110000) >> 4) == 0b00 ) {
        let v = 0;
        switch (opcode & 0b1111) {
            case 0x01: v = A+B; break;
            case 0x02: v = A-B; break;
            case 0x03: v = A&B; break;
            case 0x04: v = A|B; break;
            case 0x05: v = A^B; break;
            case 0x06: v = (~A)&255; break;
            case 0x0A: v = A>>B; break;
            case 0x0B: v = A<<B; break;
        }
        memory.writeInt16BE(v,D);
        // console.log(`${A} ${B} = ${v} => ${D}`)
    } else
    if ( ((opcode & 0b00110000) >> 4) == 0b01 ) {
        switch (opcode & 0b1111) {
            case 0b0000: if (A == B) ptr = D-ARCH.instruction_width; break;
            case 0b0001: if (A != B) ptr = D-ARCH.instruction_width; break;
            case 0b0010: if (A < B)  ptr = D-ARCH.instruction_width; break;
            case 0b0011: if (A <= B) ptr = D-ARCH.instruction_width; break;
            case 0b0100: if (A > B)  ptr = D-ARCH.instruction_width; break;
            case 0b0101: if (A >= B) ptr = D-ARCH.instruction_width; break;

            case 0b0110: if (A == B) { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;
            case 0b0111: if (A != B) { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;
            case 0b1000: if (A < B)  { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;
            case 0b1001: if (A <= B) { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;
            case 0b1010: if (A > B)  { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;
            case 0b1011: if (A >= B) { call_stack.writeInt16BE(ptr,(csp+=Math.floor(ARCH.data_width/8))); ptr = D-ARCH.instruction_width }; break;

            case 0b1100: ptr = call_stack.readUInt16BE((csp-=Math.floor(ARCH.data_width/8))+Math.floor(ARCH.data_width/8)); break;
        }
    } else
    if ( ((opcode & 0b00110000) >> 4) == 0b10 ) { // cpy
        memory.copy(memory,D,A,A+B);
        /*for (let i=0; i<B; i++)
            memory[D+i] = A&((2**((B-i)*8))-1);*/
    } else
    if ( ((opcode & 0b00110000) >> 4) == 0b11 ) { // special
        //if ((prog&0b111111)==0b110000&&prog[ptr+1]==)
        if ( (opcode & 0b111111) == 0b110000 ) { // syscall
            switch (A) {
                case 0b000000000:
                    break;
                case 0b000000001:
                    let dat = memory.subarray(B,memory.indexOf(0,B));
                    // 
                    // Buffer.from(`@ ${B} ${Array.from(dat).map(d=>d.toString(16).padStart(2,'0').toUpperCase())}\n`)
                    for (let byte of dat.map(c=>chr(String.fromCharCode(c)).charCodeAt())) {
                        if (byte == 10) {
                            tvramptr = ARCH.columns*(Math.floor(tvramptr/ARCH.columns)+1);
                        } else {
                            //memory[(tvramptr  )+tvram(0,0)] = byte;
                            //memory[(tvramptr  )+tvram(0,0)] = byte;
                            memory[(tvramptr++)+tvram(0,0)] = byte;
                        }
                        memory.writeUint16BE(tvramptr,ARCH.tvramptraddr);
                        await sleep(0);
                    }
                    // process.stdout.write(dat.map(c=>Object.keys(tabl).includes(c)?tabl[String.fromCharCode(c)].charCodeAt():c));
                    break;
                case 0b000000010:
                    v = (await getch(false)).toUpperCase().replace('\r','\n').charCodeAt();
                    memory[B] = v;
                    break;
            }
        }else
        if ( (opcode & 0b111111) == 0b110001 ) { // brk
            break;
        } else
        if ( (opcode & 0b111111) == 0b110010 ) { // dat
            let len = A;
            if (D+len>memory.length||ptr+len>prog.length) {
                err('Halting:',`Segmentation Fault  Attempt to access ${D+len>memory.length?`memory at address ${memory.length} (>${memory.length-1})`:`program data at address ${prog.length} (>${prog.length-1})`}`);
                //console.log(`\n\x1b[m\x1b[31;1mHalting:\x1b[0;31m Segmentation Fault\x1b[m\n         Attempt to access ${D+len>memory.length?`memory at address ${memory.length} (\x1b[31m>${memory.length-1}\x1b[0m)`:`program data at address ${prog.length} (\x1b[31m>${prog.length-1}\x1b[0m)`}`);
                break;
            }
            let dat = Buffer.allocUnsafe(len);
            let end = ptr+len +ARCH.instruction_width;
            ptr += ARCH.instruction_width;
            while (ptr < end)
                dat[ptr-(end-len)] = prog[ptr++];
            memory.set(dat,D);
            ptr -= ARCH.instruction_width;
            // tvramptr = memory[ARCH.memory_size-ARCH.columns*ARCH.rows*3-3]<<8 + memory[ARCH.memory_size-ARCH.columns*ARCH.rows*3-2];
        }
    }

    /*if (save) {
        if (in_tvram(D) || in_svram(D) || in_pvram(D)) {
            memory[D]   = v&0b11111111;
        } else {
            for (let i=0; i<sl; i++)
                memory[D+i] = v&((2**((sl-i)*8))-1);
            //memory[(tvramptr++)+tvram(0,0)] = D.toString().charCodeAt(0)??'0';
            //memory[(tvramptr++)+tvram(0,0)] = D.toString().charCodeAt(1)??'0';
            //memory[(tvramptr++)+tvram(0,0)] = D.toString().charCodeAt(2)??'0';
            //memory[D]   = v&0b1111111100000000;
            //memory[D+1] = v&0b0000000011111111;
        }
        // tvramptr = memory[ARCH.memory_size-ARCH.columns*ARCH.rows*3-3]<<8 + memory[ARCH.memory_size-ARCH.columns*ARCH.rows*3-2];
    }*/

    ptr += ARCH.instruction_width;

    if (Number.isNaN(ptr) || call_stack[csp] == undefined) {
        err('Halting:','Stack overflow');
        break;
    }

    await sleep(0);

    //await(new Promise(r=>setTimeout(r,10)));

}

clearInterval(vpi);
vramPoll();

// fs.writeFileSync('.memdump',memory);

/*for (let v of Array.from(memory).map((v,i)=>[v,i]).filter(v=>!(in_pvram(v[1])||in_svram(v[1])||in_tvram(v[1]))&&v[0]!=0))
    console.log(v);*/

console.log('\x1b[m');

screen.postMessage('KILL');

process.exit();

})();