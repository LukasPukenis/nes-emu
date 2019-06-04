import { ROM } from './rom';
import { CPU, CPU_FREQ } from './cpu';
import { PPU } from './ppu';
import { Memory } from './memory';
import { Mapper } from './mappers/mapper';
import { Mapper0 } from './mappers/mapper0';
import { Controller } from './controller';

// @ts-ignore
window.debug = [];

export class NES {
    private cpu: CPU;
    private ppu: PPU;
    private memory: Memory;
    private rom: ROM;
    private mapper: Mapper;
    private controller1: Controller;
    private controller2: Controller;

    private totalCycles: number = 0;
    private lastTime: number = 0;
    
    canvas: HTMLCanvasElement;
    debugCanvas: HTMLCanvasElement;
    

    constructor(canvas: HTMLCanvasElement, debugCanvas: HTMLCanvasElement = null) {        
        // @ts-ignore
        if (!window.hasOwnProperty('TEST'))
            console.assert(canvas);

        this.canvas = canvas;
        this.debugCanvas = debugCanvas;
        
        this.controller1 = new Controller();
        this.controller2 = new Controller();                
    }
    
    printBlaargDebugMessage() {
        const mem = this.memory;
        const status = mem.read(0x6000, true);
        
        if (status == 0) {
            console.log("BLAARG's status is OK");
        } else {
            let res:any = [];

            let data:any = -1;
            let i = 0;
            while (data != 0) {
                data = mem.read(0x6004+i, true);
                res.push(String.fromCharCode(parseInt(data, 10)));
                i++;
            }            
            console.log("BLAARG has an error: ", res.join(''));
        }
    }

    async load(path: string, startingAddress?: number) {
        console.log('loading...', path);
        this.rom = new ROM();

        await this.rom.load(path)        

        const mapper = this.rom.getMapper();
        if (mapper == 0) {
            this.mapper = new Mapper0(this.rom);
        } else {
            throw new Error(`Mapper ${mapper} NOT SUPPORTED`);
        }

        this.memory = new Memory(this);        
        this.cpu = new CPU(this);
        this.ppu = new PPU(this, this.canvas, this.debugCanvas);


        this.cpu.loadROM(this.rom, startingAddress);

        console.log('loaded!');
    }

    getROM(): ROM {
        return this.rom;
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

    runFor(time: number) {
        this.step(time);
    }

    step(time: number) {
        // @ts-ignore
        if (window.finished) return;

        let currTime = new Date().getTime();        
        let dt = ((currTime - this.lastTime) / 1000.0);
        if (time > 0) dt = time;

        this.lastTime = currTime;

        // fuse for not hogging CPU 100%
        let _dt = dt < 0.2 ? dt : 0.00;        
        let cyclesToRun = _dt * CPU_FREQ;
        while (cyclesToRun > 0) {            
            let cpuCyclesUsed = this.cpu.step();                        
            cyclesToRun -= cpuCyclesUsed;
            
            // ppu runs at exactly 3 times the CPU clock                
            this.ppu.step(cpuCyclesUsed * 3);            

            this.totalCycles += cpuCyclesUsed;
        }
        
        // lets render stuff in one go - this should work for most basic NROM games
        // which do not do any trickery per scanline, no visual effects based on ppu timing
       this.ppu.render();
    }

    _step(delta: number) {
        this.step(0);

        requestAnimationFrame(this._step.bind(this));
    }

    run() {
        this.lastTime = new Date().getTime();
        requestAnimationFrame(this._step.bind(this));
    }
}
