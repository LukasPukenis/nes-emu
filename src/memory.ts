import { NES } from "./nes";
import { Utils } from "./utils";
import { Mapper } from "./mappers/mapper";

export class Memory {
    nes: NES;
    private memory: Uint8Array;
    private ram: Uint8Array;
    private apudata: Uint8Array;
    private mapper: Mapper;

    constructor(nes: NES) {
        this.nes = nes;
        this.ram = new Uint8Array(2*1024);
        this.mapper = nes.getMapper();
        
        this.apudata = new Uint8Array(1);
        this.apudata[0] = 0xFF;
        
        for (let i = 0x0; i < 0x2*1024; i++)
            this.ram[i] = 0x00;
    }

    dump(from: number, to: number) {
        let cnt = 0;
        let data = '';
        for (let i = from; i <= to; i++) {
            data += this.ram[i].toString(16).padStart(2, '0') +" ";
            cnt ++;
            cnt %= 16;

            if (cnt == 0) {
                console.log(data);
                data = '';
            }
        }

    }

    read(addr: number, poke: boolean = false) {
        // zero page? it's also mirrored twice: 0...0x7FF 0x800..0xFFF
        // console.log("Reading ", Utils.prettyHex(addr));

        if (addr < 0x2000) {            
            return this.ram[ addr % 0x800 ] & 0xFF;
        } else if (addr < 0x4000) {
            return this.nes.getPPU().readRegister(0x2000 + addr % 8, poke);
        } else if (addr == 0x4014) {
            return this.nes.getPPU().readRegister(addr, poke);
        } else if (addr == 0x4015) {
            // apu            
            // throw new Error("APU memory access not implemented");            
            return this.apudata[0];
        } else if (addr == 0x4016) { 
            const re = this.nes.getController1().read();
            return re;
        } else if (addr == 0x4017) {
            const re = this.nes.getController2().read();
            return re;
        } else {
            return this.mapper.read(addr, poke);            
        }
    }

    write(addr: number, value: number) {        
        if (addr < 0x2000) {
            this.ram[ addr % 0x800 ] = value;            
        } else if (addr < 0x4000) {
            this.nes.getPPU().writeRegister(0x2000 + addr%8, value);
        } else if (addr == 0x4014) {
            this.nes.getPPU().writeRegister(addr, value);        
        } else if (addr < 0x4014) {
            // APU
            // PPU I/O registers at $2000-$2007 are mirrored at $2008-$200F, $2010-$2017, $2018-$201F, and so forth, all the way up to $3FF8-$3FFF.
            // this.nes.getPPU().writeRegister(0x2000 + addr%8, value);        
        } else if (addr == 0x4015) {
            // apu
            // this.memory[ addr ] = value & 0xFF;
            this.apudata[0] = value;
        } else if (addr == 0x4016) {
            this.nes.getController1().write(value);
            this.nes.getController2().write(value);
        } else if (addr == 0x4017) {
        } else {
            this.nes.getMapper().write(addr, value);
            // this.memory[ addr ] = value; // todo: what???? there's already .ram
        }
    }

    read16bug(addr: number, poke: boolean = false) {        
        let _addr:number = (addr & 0xFF00) | (0xFF & ((addr & 0xFF) + 1));

        let low =  this.read(addr, poke) & 0xFF;
        let high = this.read(_addr, poke) & 0xFF;        

        let finalAddr: number = (high << 8) | low;
        return finalAddr;
    }

    read16(addr: number, poke: boolean = false) {
        let low =  this.read(addr, poke);
        let high = this.read(addr+1, poke);
        return (high << 8) | low;
    }        

    print(from: number, to:number) {
        let output: string[] = [];

        let data: string[] = [];

        for(let i = from; i <= to; i++) {
            data.push(i.toString(16).toUpperCase().padStart(4, '0') +" " +this.read(i, true).toString(16).toUpperCase().padStart(2, '0'));                        
        }   
                
        output = data;

        console.log(`--- MEMORY PRINT range: ${from.toString(16)}..${to.toString(16)}`);
        console.log(output.join("   "));
        console.log(`--- END OF MEMORY PRINT range`);
    }
}