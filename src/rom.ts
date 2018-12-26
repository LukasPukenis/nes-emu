export function printhex(data: any, len: number = 10, offset: number = 0) {
    let out = '';
    for (let i = offset; i < len+offset; i++) {
        let num = data[i];
        out += (num >>> 0 & 0xFF).toString(16) + " ";
    }

    console.log(out);    
}

export class ROM {
    private filename: string;
    private data: Int8Array;
    private prgroms: any[] = [];

    constructor(filename: string) {
        this.filename = filename;
    }

    async parse() {
        let data = await fetch(this.filename);
        let parsedData = await data.arrayBuffer();
        this.data = new Int8Array(parsedData);

        if (!this.validate(this.data))
            return false;        

        let prgRomCnt = this.data[5];
        console.log('there are', prgRomCnt, 'PRGROMS');
        console.log('==', this.data.length);

        for (let i = 0; i < prgRomCnt; i++)            
            this.prgroms.push(this.data.slice(16 + i*0x4000, (i+1)*0x4000+16));

        return true;
    }

    getPRGROMS() {
        return this.prgroms;
    }

    validate(data: Int8Array) {
        console.assert(data && data.length > 0);        

        return data[0] == 0x4E &&
               data[1] == 0x45 &&
               data[2] == 0x53 &&
               data[3] == 0x1A;
    }
}