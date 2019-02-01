import { NES } from "./nes";

export class Memory {
    nes: NES;
    private memory: Uint8Array;
    private ram: Uint8Array;

    constructor(nes: NES) {
        this.nes = nes;
        this.memory = new Uint8Array(0xFFFF);
        this.ram = new Uint8Array(2*1024);

        for (let i = 0x4000; i < 0x401F; i++)
            this.memory[i] = 0xFF;        
    }

    read(addr: number) {                
        // zero page? it's also mirrored twice: 0...0x7FF 0x800..0xFFF
        if (addr < 0x2000) {            
            return this.ram[ addr % 0x800 ] & 0xFF;
        } else if (addr < 0x4000 || addr == 0x4014) {
            // ppu            
            return this.nes.getPPU().read(addr);
        } else if (addr == 0x4015) {
            // apu            
            return this.memory[ addr ] & 0xFF;
        } else if (addr == 0x4016) {
            // joystick 1            
            return this.memory[ addr ] & 0xFF;
        } else if (addr == 0x4017) {
            // joystick 2            
            return this.memory[ addr ] & 0xFF;
        } else {
            return this.memory[ addr ] & 0xFF;
        }
    }

    read16bug(addr: number) {        
        let _addr:number = (addr & 0xFF00) | (0xFF & ((addr & 0xFF) + 1));

        let low =  this.read(addr) & 0xFF;
        let high = this.read(_addr) & 0xFF;        

        let finalAddr: number = (high << 8) | low;
        return finalAddr;
    }

    read16(addr: number) {
        let low =  this.read(addr);
        let high = this.read(addr+1);
        return (high << 8) | low;
    }

    write(addr: number, value: number) {        
        if (addr < 0x2000) {            
            this.ram[ addr % 0x800 ] = value;            
        } else if (addr < 0x4000 || addr == 0x4014) {
            // ppu
            this.nes.getPPU().write(addr, value);
        } else if (addr == 0x4015) {
            // apu
            this.memory[ addr ] = value & 0xFF;
        } else if (addr == 0x4016) {
            // joystick 1
            this.memory[ addr ] = value & 0xFF;
        } else if (addr == 0x4017) {
            // joystick 2
            this.memory[ addr ] = value & 0xFF;
        } else {
            this.memory[ addr ] = value;
        }
    }    

    print(from: number, to:number) {
        let output: string[] = [];

        let data: string[] = [];

        for(let i = from; i <= to; i++) {
            data.push(i.toString(16).toUpperCase().padStart(4, '0') +" " +this.read(i).toString(16).toUpperCase().padStart(2, '0'));                        
        }   
                
        output = data;

        console.log(`--- MEMORY PRINT range: ${from.toString(16)}..${to.toString(16)}`);
        console.log(output.join("   "));
        console.log(`--- END OF MEMORY PRINT range`);
    }
}