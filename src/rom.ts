export function printhex(data: any, len: number = 10, offset: number = 0) {
    let out = '';
    for (let i = offset; i < len+offset; i++) {
        let num = data[i];
        out += (num >>> 0 & 0xFF).toString(16) + " ";
    }

    console.log(out);    
}

export class ROM {
    private path: string;
    private data: Int8Array;
    private prgroms: any[] = [];
    private chrroms: any[] = [];

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
        let data = await fetch(this.path);
        console.log(this.path);
        let parsedData = await data.arrayBuffer();
        this.data = new Int8Array(parsedData);

        if (!this.validate(this.data))
            return false;        

        let prgRomCnt = this.data[4];
        let chrRomCnt = this.data[5]; // Value 0 means the board uses CHR RAM)
        
        for (let i = 0; i < prgRomCnt; i++)            
            this.prgroms.push(this.data.slice(16 + i*0x4000, (i+1)*0x4000+16));

        let chrOffset = prgRomCnt * 0x4000 + 16;
        for (let i = 0; i < chrRomCnt; i++) {
            this.chrroms.push(this.data.slice(chrOffset + i*0x2000, chrOffset + (i+1)*0x2000));
        }

        console.log(`PRG ROMS: #${prgRomCnt}`);
        console.log(`CHR ROMS: #${chrRomCnt}`);
        return true;
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