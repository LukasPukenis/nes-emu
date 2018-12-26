import { ROM } from './rom';
import { CPU } from './cpu';

class NES {
    private cpu: CPU;
    private rom: ROM;    
    
    constructor(path: string) {
        this.rom = new ROM(romPath);
        
        let status = this.rom.parse().then((status: boolean) => {
            if (!status) {
                console.error(`Failed to run rom file @ ${romPath}`);
            } else {
                console.log('Rom is good to go');
                this.cpu = new CPU(this.rom);       
                this.run();
            }
        });
        
    }

    run() {        
        this.cpu.dumpDebug();
        this.cpu.step();

        this.cpu.dumpDebug();
        this.cpu.step();

        this.cpu.dumpDebug();
        this.cpu.step();

        this.cpu.dumpDebug();
    }
}


const romPath = './roms/nestest.nes';
let nes = new NES(romPath);
