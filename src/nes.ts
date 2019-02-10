import { ROM } from './rom';
import { CPU, CPU_FREQ } from './cpu';
import { PPU } from './ppu';
import { Memory } from './memory';

export class NES {
    private cpu: CPU;
    private ppu: PPU;
    private memory: Memory;
    private rom: ROM;
    private lastTime: number = 0;
    private fuse: boolean = false;
    private fuseFill: number = 0;
    private fuseLimit: number = 100;

    constructor() {
        this.memory = new Memory(this);
        this.ppu = new PPU(this);
        this.cpu = new CPU(this);  
    }
     
    async load(path: string) {
        console.log('loading...');
        this.rom = new ROM();
        await this.rom.load(path)        
        this.cpu.loadROM(this.rom);
        console.log('loaded!');
    }

    getPPU(): PPU {
        return this.ppu;
    }

    getCPU(): CPU {
        return this.cpu;
    }

    getMemory(): Memory {
        return this.memory;
    }

    step() {

        let currTime = new Date().getTime();
        let dt = currTime - this.lastTime;
        this.lastTime = currTime;
        dt /= 1000.0;

        let cyclesToRun = dt * CPU_FREQ;
        if (!this.fuse)
            console.log('cyclesToRun:', cyclesToRun);
    
        while (cyclesToRun > 0) {
            if (this.fuse) return;
            this.fuseFill++;
            if (this.fuseFill >= this.fuseLimit)
                this.fuse = true;

            let cpuCyclesUsed = this.cpu.step();
            cyclesToRun -= cpuCyclesUsed;

            // ppu runs at exactly 3 times the CPU clock
            for (let i = 0; i < 3*cpuCyclesUsed; i++)
                this.ppu.step();            
        }        


        // for (let i = 0; i < cpuCycles; i++)
        //     this.ppu.step();        
    }

    dump() {
        return this.cpu.dumpDebug();
    }

    _step() {
        this.step();

        requestAnimationFrame(this._step.bind(this));
    }

    run() {
        this.lastTime = new Date().getTime();
        this._step();
    }
}

const path = './roms/DonkeyKong.nes';
let nes = new NES();
nes.load(path).then(() => {    
    nes.run();
});
