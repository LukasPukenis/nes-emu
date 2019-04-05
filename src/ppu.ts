import { NES } from "./nes";
import { CPU } from "./cpu";
import { Utils } from "./utils";

/**
 * Abbreviations used:
 * OAM - Object Attribute Memory, 64 entries, 4 bytes each
 */

// todo: this is wrong, PPU reads from the cartridge and only from pallettes(32), nametables(2048) and OAM(256) all of which are
const VRAM_SIZE = 0x8000;

export class PPU {
    nes: NES;
    vram: Uint8Array;
    mirrorTable: Uint16Array;
    writeToggle: boolean = false;
    address: number;
    tempAddrToWrite: number = 0;
    bufferedReadValue: number;
    
    cycle: number = 0;
    oddFrame: boolean = true;
    scanLine: number = 0;
    frame: number = 0;

    nmiDelay: number = 0;
    register: number = 0;
    nmiPrevious: boolean = false;

    spritePatterns: number[] = [];
    spritePositions: number[] = [];
    spritePriorities: number[] = [];
    spriteIndexes: number[] = [];

    flagOverflow: boolean = false;
    flagZeroHit: boolean = false;
    
    spriteCount: number = 0;
    tileData: number = 0;
    lowTileByte: number = 0;
    highTileByte: number = 0;
    flagBGTable: number = 0;
    attributeTableByte: number = 0;
    nameTableByte: number = 0;

    maskShowLeftBG: number;
    maskShowLeftSprites: number;
    maskGrayscale: number;
    maskShowBG: number;
    maskShowSprites: number;

    controlIncrement: number;// 0: add 1; 1: add 32
    controlNameTable: number;// 0: $2000; 1: $2400; 2: $2800; 3: $2C00
    controlSpriteTable: number;// 0: $0000; 1: $1000; ignored in 8x16 mode
    controlBackgroundTable: number;// 0: $0000; 1: $1000
    controlSpriteSize: number;// 0: 8x8; 1: 8x16
    controlMasterSlave: number;// 0: read EXT; 1: write EXT

    generateNMI: boolean = true;
    oamData: number[] = [];
    oamAddress: number = 0;
    v_blank: boolean = true;

    canvas: CanvasRenderingContext2D;
    debugCanvas: CanvasRenderingContext2D;
    
    imageData: ImageData;
    debugImageData: ImageData;

    pixels: Uint8ClampedArray;
    debugPixels: Uint8ClampedArray;

    debugInfo: string[] = [];

    constructor(nes: NES, canvas: CanvasRenderingContext2D, debugCanvas: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.debugCanvas = debugCanvas;

        if (this.canvas) {
            this.imageData = this.canvas.createImageData(256, 240);
            this.pixels = this.imageData.data;
        }

        if (this.debugCanvas) {
            this.debugImageData = this.debugCanvas.createImageData(256*2, 240);
            this.debugPixels = this.debugImageData.data;
        }

        this.nes = nes;
        this.vram = new Uint8Array(VRAM_SIZE);
        this.mirrorTable = new Uint16Array(VRAM_SIZE);

        // prepopulate mirror with all the values
        for (let i = 0; i < this.mirrorTable.length; i++)
            this.mirrorTable[i] = i;

        this.setMirror(0x3f20, 0x3f00, 0x20);
        this.setMirror(0x3f40, 0x3f00, 0x20);
        this.setMirror(0x3f80, 0x3f00, 0x20);
        this.setMirror(0x3fc0, 0x3f00, 0x20);
        this.setMirror(0x3000, 0x2000, 0xf00);
        this.setMirror(0x4000, 0x0000, 0x4000);

        if (this.nes.getROM().getMirror() == 0) {
            this.setMirror(0x2800, 0x2000, 0x400);
            this.setMirror(0x2c00, 0x2400, 0x400);
        } else {
            this.setMirror(0x2400, 0x2000, 0x400);
            this.setMirror(0x2800, 0x2400, 0x400);
        }
    }
    
    // mirror table literally holds the address it's mirrored to
    setMirror(from: number, to: number, size: number) {
        for (let i = 0; i < size; i++)
            this.mirrorTable[from+i] = to+i;
    }

    nmiChange() {
        let nmi = this.generateNMI && this.v_blank;

        if (nmi && !this.nmiPrevious)
            this.nmiDelay = 15;
            
        this.nmiPrevious = nmi;
    }
    
    tick() {
        if (this.nmiDelay > 0) {
            this.nmiDelay--;
            if (this.nmiDelay == 0 && this.v_blank && this.generateNMI) {
                // console.log('nmi');
                this.nes.getCPU().triggerNMI();
            }
        }

        if (this.maskShowBG || this.maskShowSprites) {
            if (this.oddFrame && this.scanLine == 261 && this.cycle == 339) {
                this.cycle = 0;
                this.scanLine = 0;
                this.frame++;
                this.oddFrame = !this.oddFrame;
                return;
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
    }

    directRenderBG() {
        let baseNameTable: number;
        switch(this.controlNameTable) {
            case 0:
                baseNameTable = 0x2000; break;
            case 1:
                baseNameTable = 0x2400; break;
            case 2:
                baseNameTable = 0x2800; break;
            case 3:
                baseNameTable = 0x2C00; break
        }

        let backgroundBase: number;
        switch (this.controlBackgroundTable) {
            case 0: 
                backgroundBase = 0x0000; break;
            case 1:
                backgroundBase = 0x1000; break;
        }

        for (let j = 0; j < 30; j++) {
            for (let i = 0; i < 32; i++) {
                let pixelIdx = (j*256*8 + i*8) * 4 ;                                                

                // todo: backgroundbase neklauso, reik rankom pridet 0x100
                let index = baseNameTable + (j << 5) + i;
                
                let spriteIndex = this.read(index);

                for (let n = 0; n < 8; n++) {
                    let line0 = this.read(backgroundBase+(spriteIndex*16)+n + 0);
                    let line1 = this.read(backgroundBase+(spriteIndex*16)+n + 8);

                    for (let m = 0; m < 8; m++) {
                        let reduct = 7 - m;
                        let val0 = (line0 >> reduct) & 1;
                        let val1 = (line1 >> reduct) & 1;                        
                        let finalVal = val0 | (val1 << 1);
                                            
                        let palletteByte = this.read(0x23C0 + (j % 2 * 32) + (i % 2));
                        let bits = 0;

                        if (i % 2 == 0 && j % 2 == 0) {
                            // top left corner case
                            bits = (palletteByte >> 0 ) & 3;
                        } else if (i % 2 == 1 && j % 2 == 0) {
                            // top right corner case
                            bits = (palletteByte >> 2 ) & 3;
                        } else if (i % 2 == 0 && j % 2 == 1) {
                            // bottom left corner case
                            bits = (palletteByte >> 4 ) & 3;
                        } else if (i % 2 == 1 && j % 2 == 1) {
                            // bottom right corner case
                            bits = (palletteByte >> 6 ) & 3;
                        }
                        

                        let pixelOffset = (n * 256 + m) * 4;
                        let finalPixelIdx = pixelIdx + pixelOffset;

                        this.pixels[finalPixelIdx + 0] = finalVal * 50;
                        this.pixels[finalPixelIdx + 1] = finalVal * 50;
                        this.pixels[finalPixelIdx + 2] = finalVal * 50;
                        this.pixels[finalPixelIdx + 3] = 0xff;                        
                    }                    
                }                
            }
        }
    }

    directRenderSprites() {
        let baseNameTable: number;
        switch(this.controlNameTable) {
            case 0:
                baseNameTable = 0x2000; break;
            case 1:
                baseNameTable = 0x2400; break;
            case 2:
                baseNameTable = 0x2800; break;
            case 3:
                baseNameTable = 0x2C00; break
        }

        let backgroundBase: number;
        switch (this.controlBackgroundTable) {
            case 0: 
                backgroundBase = 0x0000; break;
            case 1:
                backgroundBase = 0x1000; break;
        }

        let spriteBase: number;
        switch (this.controlSpriteTable) {
            case 0: 
                spriteBase = 0x0000; break;
            case 1:
                spriteBase = 0x1000; break;
        }

        const oam = this.oamData;
        for (let i = 0; i < 64; i++) {
            const idx = i*4;
            const y = oam[idx + 0];
            const sprite = spriteBase + oam[idx + 1];
            
            const attr = oam[idx + 2];
            const x = oam[idx + 3];
            
            // console.log(`sprite ${sprite} @ ${x}x${y}`);

            const pixelIdx = (y*256 + x) * 4;

            for (let n = 0; n < 8; n++) {
                const line0 = this.read((sprite*16)+n + 0);
                const line1 = this.read((sprite*16)+n + 8);
                
                for (let m = 0; m < 8; m++) {
                    const reduct = 7 - m;
                    const val0 = (line0 >> reduct) & 1;
                    const val1 = (line1 >> reduct) & 1;
                    const finalVal = val0 | (val1 << 1);
                    
                    const pixelOffset = (n * 256 + m) * 4;
                    const finalPixelIdx = pixelIdx + pixelOffset;

                    this.pixels[finalPixelIdx + 0] = finalVal * 50;
                    this.pixels[finalPixelIdx + 1] = finalVal * 50;
                    this.pixels[finalPixelIdx + 2] = finalVal * 50;
                    this.pixels[finalPixelIdx + 3] = 0xff;
                }
            }        
        }
    }

    directRender() {
        this.directRenderBG();
        this.directRenderSprites();
    }

    /**
     * Sprites live at 0x0000 and 0x1000 addresses. Each sprite occupies 16 bytes
     * Each 16 bytes is actually two halfs of 8bytes, they must be combined to produce the final colour index
     */
    debugRenderSprites() {
        let backgroundBase: number;
        
        for (let spriteIndex = 0; spriteIndex < 256; spriteIndex++) {
            const y = Math.trunc(spriteIndex / 16);
            const x = spriteIndex % 16;
            // debug canvas is double the size, each pixel occupies 4 bytes, 8x8 is sprite size
            const pixelIdx = (y*256*2 + x) * 4 * 8;

            for (let n = 0; n < 8; n++) {
                const line0 = this.read((spriteIndex*16)+n + 0, true);
                const line1 = this.read((spriteIndex*16)+n + 8, true);

                for (let m = 0; m < 8; m++) {
                    const reduct = 7 - m;
                    const val0 = (line0 >> reduct) & 1;
                    const val1 = (line1 >> reduct) & 1;                        
                    const finalVal = val0 | (val1 << 1);
                                                                
                    const pixelOffset = (n * 256*2 + m) * 4;
                    let finalPixelIdx = pixelIdx + pixelOffset;

                    this.debugPixels[finalPixelIdx + 0] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 1] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 2] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 3] = 0xff;                        
                }                    
            }
        }
        
        for (let spriteIndex = 0; spriteIndex < 256; spriteIndex++) {
            const y = Math.trunc(spriteIndex / 16);
            const x = spriteIndex % 16;
            // debug canvas is double the size, each pixel occupies 4 bytes, 8x8 is sprite size
            const pixelIdx = (y*256*2 + x) * 4 * 8 + 16*8*4;

            for (let n = 0; n < 8; n++) {
                const line0 = this.read((0x1000+spriteIndex*16)+n + 0, true);
                const line1 = this.read((0x1000+spriteIndex*16)+n + 8, true);

                for (let m = 0; m < 8; m++) {
                    const reduct = 7 - m;
                    const val0 = (line0 >> reduct) & 1;
                    const val1 = (line1 >> reduct) & 1;                        
                    const finalVal = val0 | (val1 << 1);
                                                                
                    const pixelOffset = (n * 256*2 + m) * 4;
                    let finalPixelIdx = pixelIdx + pixelOffset;

                    this.debugPixels[finalPixelIdx + 0] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 1] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 2] = finalVal * 50;
                    this.debugPixels[finalPixelIdx + 3] = 0xff;                        
                }                    
            }
        }
    }

    render() {
        this.debugRenderSprites();
        this.directRender();

        this.canvas.putImageData(this.imageData, 0, 0);
        this.debugCanvas.putImageData(this.debugImageData, 0, 0);
    }

    step() {
        this.tick();
        
        //////////////
        /////////////
        let preLine = this.scanLine == 261;
        let visibleLine = this.scanLine < 240;
        let renderLine = preLine || visibleLine;
        let preFetchCycle = this.cycle >= 321 && this.cycle <= 336;
        let visibleCycle = this.cycle >= 1 && this.cycle <= 256;
        let fetchCycle = preFetchCycle || visibleCycle;
        // let render: boolean = this.maskShowBG || this.maskShowSprites;                        

        if (this.scanLine == 241 && this.cycle == 1) {
            this.setVerticalBlank();
        }

        if (preLine && this.cycle == 1) {
            this.clearVerticalBlank();            
            this.flagZeroHit = false;
            this.flagOverflow = false;
        }
               
    }

    readStatus(poke: boolean): number {

        let result: number = this.register & 0x1F;
        
        if (this.flagOverflow)
            result |= 1 << 5;
        
        if (this.flagZeroHit)
            result |= 1 << 6;
        
        if (this.v_blank)// || Math.random() > 0.5)
            result |= 1 << 7;
        
        if (!poke) {
            this.v_blank = false;
            this.writeToggle = false;
        }

        this.nmiChange();
        
        return result;
    }    

    write(addr: number, value: number): void {
        // console.log('PPU write', addr.toString(16), value.toString(2));
        this.register = value;

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

    read(addr: number, poke: boolean = false): number {        
        if (addr < 0x2000) {
            return this.nes.getMapper().read(addr, poke);
        } else {
            return this.vram[addr];
        }
    }

    readRegister(addr: number, poke: boolean = false): number {
        if (addr == 0x2000) {
            return this.readControl(addr, poke);
        } else if (addr == 0x2002) {
            return this.readStatus(poke);
        } else if (addr == 0x2001) {
            return this.readMask(addr, poke);
        } else if (addr == 0x2003) {
            return this.readOAMAddress(addr, poke);
        } else if (addr == 0x2004) {
            return this.readOAMData(addr, poke);
        } else if (addr == 0x2006) {
            return this.readAddress(addr, poke);
        } else if (addr == 0x2007) {
            return this.readFromAddress(poke);
        } else if (addr == 0x4014) {
            return this.readDMA(addr, poke);
        }
    }

    writeToAddress(value: number): void {        
        // console.log("write", Utils.prettyHex(value), 'to', Utils.prettyHex(this.address));

        // console.log(this.address.toString(16), '->', value.toString(16));
        if (this.address >= 0x3000 && this.address <= 0x3EFF)
            this.address -= 0x1000; 
        this.vram[this.address] = value & 0xFF;        
        this.address += this.controlIncrement ? 32 : 1;
    }

    readFromAddress(poke: boolean): number {
        let t = this.read(this.address);

        if (this.address <= 0x3EFF) {
            let buf = this.bufferedReadValue;
            this.bufferedReadValue = t;
            t = buf;
        } else {
            this.bufferedReadValue = this.vram[this.address - 0x1000];
        }

        this.address += this.controlIncrement ? 32 : 1;

        return t;
    }

    writeAddress(value: number): void {
        value &= 0xFF;

        if (!this.writeToggle) {
            this.tempAddrToWrite = (this.tempAddrToWrite & 0x80ff) | ((value & 0x3F) << 8);
        } else {
            this.address = (this.tempAddrToWrite & 0xFF00) | value;
        } 

        this.writeToggle = !this.writeToggle;
    }
    
    setVerticalBlank() {
        this.v_blank = true;
        this.nmiChange();
    }

    clearVerticalBlank() {
        this.v_blank = false;
        this.nmiChange();
    }

    writeControl(value: number): void {
        // console.log('write ctrl', value.toString(2));

        this.controlNameTable =   ((value >> 0) & 3);
        this.controlIncrement =   ((value >> 2) & 1);
        this.controlSpriteTable = ((value >> 3) & 1);
        this.controlBackgroundTable = ((value >> 4) & 1);
        
        this.controlSpriteSize =      ((value >> 5) & 1);
        this.controlMasterSlave =     ((value >> 6) & 1);
        this.generateNMI =            ((value >> 7) & 1) == 1;
        
        this.nmiChange();
    }
    
    writeMask(value: number): void {
        // console.log('write mask', value.toString(2));
        this.maskGrayscale = (value & 1);
        this.maskShowBG = (value >> 3);
        this.maskShowSprites = (value >> 4);
        this.maskShowLeftBG = (value >> 1);
        this.maskShowLeftSprites = (value >> 2);
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
            let val = memory.read(addr);
            this.oamData[this.oamAddress] = memory.read(addr);
            this.oamAddress++;
            addr++;
        }
        
        let stall: number = 513;
        if (cpu.cycles % 2 == 1)
            stall++;

        this.nes.getCPU().setStall(stall);
    }

    readAddress(value: number, poke: boolean): number {
        return 1;
    }

    readControl(value: number, poke: boolean): number {
        return 1;
    }
    
    readMask(value: number, poke: boolean): number {
        return 1;
    }

    readOAMAddress(value: number, poke: boolean): number {
        return this.oamAddress;
    }

    readOAMData(value: number, poke: boolean): number {
        return this.oamData[value];
    }

    readDMA(value: number, poke: boolean): number {
        return 1;
    }
}