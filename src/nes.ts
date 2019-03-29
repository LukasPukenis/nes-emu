import { ROM } from './rom';
import { CPU, CPU_FREQ } from './cpu';
import { PPU } from './ppu';
import { Memory } from './memory';
import { Mapper } from './mappers/mapper';
import { Mapper0 } from './mappers/mapper0';
import { Controller } from './controller';


export class NES {
    private cpu: CPU;
    private ppu: PPU;
    private memory: Memory;
    private rom: ROM;
    private mapper: Mapper;
    private controller1: Controller;
    private controller2: Controller;

    private lastTime: number = 0;
    
    constructor(canvas: HTMLCanvasElement) {
        console.assert(canvas);

        this.controller1 = new Controller();
        this.controller2 = new Controller();
        
        this.rom = new ROM();
        this.memory = new Memory(this);        
        this.ppu = new PPU(this, canvas && canvas.getContext('2d'));
        this.cpu = new CPU(this);

        this.mapper = new Mapper0(this.rom, this.cpu, this.ppu);
    }
     
    async load(path: string, startingAddress?: number) {
        console.log('loading...');        
        await this.rom.load(path)        
        this.cpu.loadROM(this.rom, startingAddress);
        console.log('loaded!');
    }

    getController1() {
        return this.controller1;
    }
    
    getController2() {
        return this.controller2;
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

    getMapper(): Mapper {
        return this.mapper;
    }

    step() {
        let currTime = new Date().getTime();        
        let dt = (currTime - this.lastTime) / 1000.0;
        this.lastTime = currTime;

        let cyclesToRun = dt * CPU_FREQ;
        // console.log('cyclesToRun:', Math.round(cyclesToRun));
        
        // @ts-ignore
        while (cyclesToRun > 0 && !window.finish) {
            let cpuCyclesUsed = this.cpu.step();                        
            cyclesToRun -= cpuCyclesUsed;
                        
            // ppu runs at exactly 3 times the CPU clock
            for (let i = 0; i < 3*cpuCyclesUsed; i++) {
                this.ppu.step();
            }
        }

        // lets render stuff in one go - this should work for most basic NROM games
        // which do not do any trickeri per scanline, no visual effects based on ppu timing
        this.ppu.render();

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
