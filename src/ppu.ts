import { NES } from "./nes";
import { CPU } from "./cpu";

/**
 * Abbreviations used:
 * OAM - Object Attribute Memory, 64 entries, 4 bytes each
 */


export class PPU {
    nes: NES;
    vram: Uint8Array;
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

    maskShowLeftBG: boolean;
    maskShowLeftSprites: boolean;
    maskGrayscale: boolean;
    maskShowBG: boolean = false;
    maskShowSprites: boolean = false;

    controlIncrement: boolean;// 0: add 1; 1: add 32
    controlNameTable: number;// 0: $2000; 1: $2400; 2: $2800; 3: $2C00
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
    debugInfo: string[] = [];

    constructor(nes: NES, canvas: CanvasRenderingContext2D) {    
        this.canvas = canvas;
        if (this.canvas) {
            this.imageData = this.canvas.createImageData(256, 240);
            this.pixels = this.imageData.data;
        }

        this.nes = nes;
        this.vram = new Uint8Array(0x8000);
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

    render() {
        // @ts-ignore
        // if (!window.render) return;

        // 1) nametable byte
        // 2) data from chrom
        // 3) pixels
        // 4) putImageData

        for (let i = 0; i < 256*240*4; i++) {
            // this.pixels[i] = Math.random()*0xFF;
        }
        
        let d = [];

        for (let j = 0; j < 30; j++) {
            for (let i = 0; i < 32; i++) {
                let pixelIdx = (j*256*8 + i*8) * 4 ;                
                
                let index = 0x2000 + (j << 5) + i; // todo proper starting address
                
                // d.push(index);

                let nametable = this.read(index) + 0x100;
                
                // nametable = 0xD3 * 16;
                // nametable = 0xD1;

                // console.log("====");
                for (let n = 0; n < 8; n++) {
                    // if (nametable == 0xD3) debugger;
                    let line0 = this.read((nametable*16)+n + 0);
                    let line1 = this.read((nametable*16)+n + 8);

                    for (let m = 0; m < 8; m++) {
                        let reduct = 7 - m;
                        let val0 = (line0 >> reduct) & 1;
                        let val1 = (line1 >> reduct) & 1;
                        let finalVal = val0 + val1;
                        
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

        // console.log(d.length, '===', d);
        // debugger;

        this.canvas.putImageData(this.imageData, 0, 0);

        // let idx = 0x1D3 * 16;
        // let chrrom = nes.rom.getCHRROMS()[0];
        // for (let i = 0; i < 16; i++) {
        //    let v = chrrom[idx + i] & 0xFF;
        //    console.log(i.toString().padStart(2, '0'), v.toString(2).padStart(8, '0'));
        // }
       

        // function getSprite(index) {
        //     let idx = index * 16;
        //     let output1 = [];
        //     let output2 = [];
            
        //     let output = [];
          
        //     for (let i = 0; i < 8; i++) {
        //         let byte1 = nes.ppu.vram[idx+i];  
        //         let byte2 = nes.ppu.vram[idx+i+8];
                
          
        //         for (let j = 0; j < 8; j++) {
        //             let bit0 = byte1 & 1;
        //             let bit1 = byte2 & 1;
        //             let finalByte = bit0 + bit1;
        //             output.push(finalByte);
        //             byte1 >>= 1;
        //             byte2 >>= 1;
        //         }
        //     }
          
        //     return output;
        //   }
          
        //   function printSprite(index) {
        //   for (let i = 0; i < 256*240; i++) {
        //     let idx = i*4;
        //     nes.ppu.pixels[idx+0] = 0xFF;
        //     nes.ppu.pixels[idx+1] = 0x0;
        //     nes.ppu.pixels[idx+2] = 0x0;
        //     nes.ppu.pixels[idx+3] = 0xFF;
        //   }
          
          
        //       let data = getSprite(index);
              
        //       for (let i = 0; i < 8; i++) {
        //           for (let j = 0; j < 8; j++) {
        //               let pidx = i * 8 + j;
        //               let idx = (i * 256+ + j) * 4;
        //               nes.ppu.pixels[idx + 0] = data[pidx] * 50;
        //               nes.ppu.pixels[idx + 1] = data[pidx] * 50;
        //               nes.ppu.pixels[idx + 2] = data[pidx] * 50;
        //               nes.ppu.pixels[idx + 3] = data[pidx] * 0xFF;
        //           }        
        //       }
          
        //       nes.ppu.canvas.putImageData(nes.ppu.imageData, 0, 0);
        //   }
          
          
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
        let render: boolean = this.maskShowBG || this.maskShowSprites;                        

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
            return this.nes.getMapper().read(addr);
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
        console.log(this.address.toString(16), '->', value.toString(16));
        
        this.vram[this.address] = value & 0xFF;        
        this.address += this.controlIncrement ? 32 : 1;
    }

    readFromAddress(poke: boolean): number {
        let t = this.vram[this.address];

        if ((this.address % 0x4000) <= 0x3F00) {
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
        this.controlIncrement =   ((value >> 2) & 1) == 1;
        this.controlSpriteTable = ((value >> 3) & 1) == 1;
        this.controlBackgroundTable = ((value >> 4) & 1) == 1;
        this.controlSpriteSize =      ((value >> 5) & 1) == 1;
        this.controlMasterSlave =     ((value >> 6) & 1) == 1         
        this.generateNMI =            ((value >> 7) & 1) == 1;
        
        this.nmiChange();
    }
    
    writeMask(value: number): void {
        // console.log('write mask', value.toString(2));
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