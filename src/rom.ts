var fs = require('mz/fs')

const PRG_ROM_COUNT = 4;
const CHR_ROM_COUNT = 5;
const FLAG6 = 6;

enum MIRROR_TYPES {
    Horizontal,
    Vertical,
    None    // Ignore mirroring control or above mirroring bit; instead provide four-screen VRAM
};

class Header {
    public prgRomCnt: number = 0;
    public chrRomCnt: number = 0;
    public mirror: number = 0;
}

export class ROM {
    private path: string;
    private data: Int8Array;
    private prgroms: any[] = [];
    private chrroms: any[] = [];
    private header: Header; 

    constructor() {
    }

    async load(path: string) {
        this.path = path;

        return new Promise( async (resolve, reject) => {
            try {
                await this.parse();
                resolve();
            } catch(e) {
                reject(e);
            }
        });
    }

    async parse() {
        let data;        
        let parsedData;

        if (window.hasOwnProperty('TEST')) {
            data = await fs.readFile(this.path);
            parsedData = data;
        } else {
            data = await fetch(this.path);
            parsedData = await data.arrayBuffer();
        }
        
        this.data = new Int8Array(parsedData);

        if (!this.validate(this.data))
            return false;        
        
        this.header = new Header();

        this.header.prgRomCnt = this.data[PRG_ROM_COUNT];
        this.header.chrRomCnt = this.data[CHR_ROM_COUNT];
        this.header.mirror = this.data[FLAG6] & 1;

        for (let i = 0; i < this.header.prgRomCnt; i++)            
            this.prgroms.push(this.data.slice(16 + i*0x4000, (i+1)*0x4000+16));

        let chrOffset = this.header.prgRomCnt * 0x4000 + 16;
        for (let i = 0; i < this.header.chrRomCnt; i++) {
            this.chrroms.push(this.data.slice(chrOffset + i*0x2000, chrOffset + (i+1)*0x2000));
        }

        console.log(`PRG ROMS: #${this.header.prgRomCnt}`);
        console.log(`CHR ROMS: #${this.header.chrRomCnt}`);
        
        return true;
    }

    getMirror(): number {
        console.assert(this.header, "ROM is not yet loaded?");
        return this.header.mirror;
    }

    getPRGROMS() {
        return this.prgroms;
    }

    getCHRROMS() {
        return this.chrroms;
    }

    validate(data: Int8Array) {
        console.assert(data && data.length > 0);        

        return data[0] == 0x4E &&
               data[1] == 0x45 &&
               data[2] == 0x53 &&
               data[3] == 0x1A;
    }
}