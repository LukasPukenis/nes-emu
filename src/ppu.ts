import { NES } from "./nes";
import { CPU } from "./cpu";

/**
 * Abbreviations used:
 * OAM - Object Attribute Memory, 64 entries, 4 bytes each
 */


export class PPU {
    nes: NES;
    vram: Uint8Array;
    writeToggle: boolean;
    address: number;
    tempAddrToWrite: number;
    bufferedReadValue: number;
    
    cycle: number = 0;
    oddFrame: boolean = false;
    scanLine: number = 0;
    frame: number = 0;

    nmiDelay: number = 0;
    register: number = 0;
    nmiPrevious: boolean = false;
    maskGrayscale: boolean;
    maskShowBG: boolean;
    maskShowSprites: boolean;

    controlIncrement: boolean;// 0: add 1; 1: add 32
    controlNameTable: boolean;// 0: $2000; 1: $2400; 2: $2800; 3: $2C00
    controlSpriteTable: boolean;// 0: $0000; 1: $1000; ignored in 8x16 mode
    controlBackgroundTable: boolean;// 0: $0000; 1: $1000
    controlSpriteSize: boolean;// 0: 8x8; 1: 8x16
    controlMasterSlave: boolean;// 0: read EXT; 1: write EXT

    generateNMI: boolean = true;
    oamData: number[] = [];
    oamAddress: number = 0;
    v_blank: boolean = true;

    canvas: CanvasRenderingContext2D;
    imageData: ImageData;
    pixels: Uint8ClampedArray;

    constructor(nes: NES, canvas: CanvasRenderingContext2D) {    
        this.canvas = canvas;
        if (this.canvas) {
            this.imageData = this.canvas.createImageData(256, 240);
            this.pixels = this.imageData.data;
        }

        this.nes = nes;
        this.vram = new Uint8Array(8*1024);
    }

    copyX() {
        this.address = (this.address & 0xFBE0) |  | (this.tempAddrToWrite & 0x041F);
    }

    copyY() {

    }

    incrementX() {

    }

    incrementY() {

    }
    
    storeTile() {

    }
    
    fetchNameTableByte() {

    }

    fetchAttributeTableByte() {

    }

    fetchLowTileByte() {

    }

    fetchHighTileByte() {

    }

    renderPixel(): void {
        throw new Error("NOT YET");
    }

    nmiChange() {
        let nmi = this.generateNMI && this.v_blank;

        if (nmi && !this.nmiPrevious)
            this.nmiDelay = 15;
            
        this.nmiPrevious = nmi;
    }
    
    step() {
        if (this.nmiDelay > 0) {
            this.nmiDelay--;
            if (this.nmiDelay == 0 && this.v_blank && this.generateNMI) {
                this.nes.getCPU().triggerNMI();
            }
        }
        
        this.cycle++
        if (this.cycle > 340) {
            this.cycle = 0;
            this.scanLine++;
            if (this.scanLine > 261) {
                this.scanLine = 0;
                this.frame++;
                this.oddFrame = !this.oddFrame;
            }
        }


        //////////////
        /////////////
        let preLine = this.scanLine == 261;
        let visibleLine = this.scanLine < 240;
        let renderLine = preLine || visibleLine;
        let preFetchCycle = this.cycle >= 321 && this.cycle <= 336;
        let visibleCycle = this.cycle >= 1 && this.cycle <= 256;
        let fetchCycle = preFetchCycle || visibleCycle;
        let render: boolean = this.maskShowBG || this.maskShowSprites;

        if (render) {
            if (visibleCycle && visibleLine) {
                renderPixel();
            }     

            if (renderLine && fetchCycle) {
                let fetchAction = this.cycle % 8;
                if (fetchAction == 0) {
                    this.storeTile();
                } else if (fetchAction == 1) {
                    this.fetchNameTableByte();
                } else if (fetchAction == 3) {
                    this.fetchAttributeTableByte();
                } else if (fetchAction == 5) {
                    this.fetchLowTileByte();
                } else if (fetchAction == 7) {
                    this.fetchHighTileByte();
                }
            }

            if (preLine && this.cycle >= 280 && this.cycle <= 304) {
                this.copyY();
            }

            if (renderLine) {
                if (fetchCycle && this.cycle % 8 == 0) {
                    this.incrementX();
                }

                if (this.cycle == 256) {
                    this.incrementY();
                }

                if (this.cycle == 257) {
                    this.copyX();
                }
            }            
        }
       
        ////////////
        if (this.scanLine == 241 && this.cycle == 1) {
            this.setVBlank(true);
        }

        if (this.scanLine == 261 && this.cycle == 1) {
            this.setVBlank(false);
        }
    }

    readStatus(): number {
        let result: number = 0;

        if (this.nmiOccurred) {
            result |= 1 << 7;
        }

        this.nmiOccurred = false;
        return result;
    }    

    write(addr: number, value: number): void {
        if (addr == 0x2000) {
            this.writeControl(value);
        } else if (addr == 0x2001) {
            this.writeMask(value);
        } else if (addr == 0x2003) {
            this.writeOAMAddress(value);
        } else if (addr == 0x2004) {
            this.writeOAMData(value);
        } else if (addr == 0x2006) {
            this.writeAddress(value);
        } else if (addr == 0x2007) {
            this.writeToAddress(value);
        } else if (addr == 0x4014) {
            this.writeDMA(value);
        }
    }

    read(addr: number): number {
        if (addr == 0x2000) {
            return this.readControl(addr);
        } else if (addr == 0x2002) {
            return this.readStatus();
        } else if (addr == 0x2001) {
            return this.readMask(addr);
        } else if (addr == 0x2003) {
            return this.readOAMAddress(addr);
        } else if (addr == 0x2004) {
            return this.readOAMData(addr);
        } else if (addr == 0x2006) {
            return this.readAddress(addr);
        } else if (addr == 0x2007) {
            return this.readFromAddress();
        } else if (addr == 0x4014) {
            return this.readDMA(addr);
        }
    }

    writeToAddress(value: number): void {
        this.vram[this.address] = value & 0xFF;
        this.address += 1; // + 32 if some flag is set
    }

    readFromAddress(): number {
        let t = this.vram[this.address];

        if (this.address <= 0x3EFF) {
            let buf = this.bufferedReadValue;
            this.bufferedReadValue = t;
            t = buf;
        } else {
            this.bufferedReadValue = this.vram[this.address - 0x1000];
        }

        return t;
    }

    writeAddress(value: number): void {
        value &= 0xFFFF;

        if (this.writeToggle) {
            this.tempAddrToWrite = (value & 0x3F) << 8;        
        } else {
            this.address = this.tempAddrToWrite | value;
        } 

        this.writeToggle = !this.writeToggle;
    }
    
    writeControl(value: number): void {        
        this.controlNameTable =   ((value >> 0) & 3) == 1;
        this.controlIncrement =   ((value >> 2) & 1) == 1;
        this.controlSpriteTable = ((value >> 3) & 1) == 1;
        this.controlBackgroundTable = ((value >> 4) & 1) == 1;
        this.controlSpriteSize =      ((value >> 5) & 1) == 1;
        this.controlMasterSlave =     ((value >> 6) & 1) == 1 
        this.generateNMI =            ((value >> 7) & 1) == 1;
    }
    
    writeMask(value: number): void {
        console.log('write mask', value.toString(2));
        debugger
        this.maskGrayscale = (value & 1) == 1;
        this.maskShowBG = (value >> 3) == 1;
        this.maskShowSprites = (value >> 4) == 1;
        this.maskShowLeftBG = (value >> 1) == 1;
        this.maskShowLeftSprites = (value >> 2) == 1;
    }

    writeOAMAddress(value: number): void {
        this.oamAddress = value & 0xFFFF;
    }

    writeOAMData(value: number): void {
        this.oamData[this.oamAddress] = value & 0xFFFF;
        this.oamAddress++;    
    }

    writeDMA(value: number): void {
        let cpu = this.nes.getCPU();
        let memory = this.nes.getMemory();

        let addr = value << 8;
        for (let i = 0; i < 256; i++) {
            this.oamData[this.oamAddress] = memory.read(addr);
            this.oamAddress++;
            addr++;
        }
        
        let stall: number = 513;
        if (cpu.cycles % 2 == 1)
            stall++;

        this.nes.getCPU().setStall(stall);
    }

    readAddress(value: number): number {
        return 1;
    }

    readControl(value: number): number {
        return 1;
    }
    
    readMask(value: number): number {
        return 1;
    }

    readOAMAddress(value: number): number {
        return this.oamAddress;
    }

    readOAMData(value: number): number {
        return this.oamData[value];
    }

    readDMA(value: number): number {
        return 1;
    }
}