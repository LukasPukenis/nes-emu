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
    
    constructor(canvas: HTMLCanvasElement) {
        console.assert(canvas);
        
        this.memory = new Memory(this);

        this.ppu = new PPU(this, canvas && canvas.getContext('2d'));

        this.cpu = new CPU(this);  
    }
     
    async load(path: string, startingAddress?: number) {
        console.log('loading...');
        this.rom = new ROM();
        await this.rom.load(path)        
        this.cpu.loadROM(this.rom, startingAddress);
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
        let dt = (currTime - this.lastTime) / 1000.0;
        this.lastTime = currTime;

        let cyclesToRun = dt * CPU_FREQ;
        // console.log('cyclesToRun:', cyclesToRun);
    
        while (cyclesToRun > 0) {
            let cpuCyclesUsed = this.cpu.step();
            
            // if (this.startDebug && false)
            // @ts-ignore
            window.debug.push(this.cpu.dumpDebug());

            cyclesToRun -= cpuCyclesUsed;
                        
            // ppu runs at exactly 3 times the CPU clock
            for (let i = 0; i < 3*cpuCyclesUsed; i++) {
                let oldV = this.ppu.readStatus(false);
                this.ppu.step();            
                let newV = this.ppu.readStatus(false);
                // if (oldV != newV && newV == 0) debugger
            }
        }

    }

    _step(delta: number) {
        this.step();

        requestAnimationFrame(this._step.bind(this));
    }

    run() {
        this.lastTime = new Date().getTime();
        requestAnimationFrame(this._step.bind(this));
    }
}

// const path = './roms/DonkeyKong.nes';
const path = './roms/bkg.nes';

let nes = new NES(document.getElementById('canvas') as HTMLCanvasElement);
nes.load(path).then(() => {    
    nes.run();
});

