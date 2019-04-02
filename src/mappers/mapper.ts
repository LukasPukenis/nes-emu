import { CPU } from "../cpu";
import { PPU } from "../ppu";
import { ROM } from "../rom";

export abstract class Mapper {    
    rom: ROM;
    cpu: CPU;
    ppu: PPU;
    
    constructor(rom: ROM, cpu: CPU, ppu: PPU) {
        this.rom = rom;
        this.cpu = cpu;
        this.ppu = ppu;
    };
    abstract write(addr: number, val: number): void;
    abstract read(add: number, poke: boolean): number;
    abstract step(): void;
}