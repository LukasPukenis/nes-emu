import { ROM } from './rom';
import { CPU } from './cpu';

export class NES {
    private cpu: CPU;
    private rom: ROM;    
    
    constructor() {        
    }
     
    async load(path: string) {
        this.rom = new ROM();
        await this.rom.load(path)        
        this.cpu = new CPU(this.rom);        
    }

    step() {
        this.cpu.step();
    }

    dump() {
        return this.cpu.dumpDebug();
    }

    run() {        
        // this.cpu.dumpDebug();
        // this.cpu.step();

        // this.cpu.dumpDebug();
        // this.cpu.step();

        // this.cpu.dumpDebug();
        // this.cpu.step();

        // this.cpu.dumpDebug();
    }
}

// const path = './roms/nestest.nes';
// let nes = new NES(path);
