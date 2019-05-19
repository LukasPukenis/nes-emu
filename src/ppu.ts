import { NES } from "./nes";
import { CPU } from "./cpu";
import { Utils } from "./utils";
import { Mapper } from "./mappers/mapper";
import { Memory } from "./memory";

const DEBUG_OAM = false; // makes a blinking pixel on the top left corner of a sprite
const DEBUG_SPRITES = false; // draws sprites in a single color(whole 8x8 or 8x16)
/**
 * Abbreviations used:
 * OAM - Object Attribute Memory, 64 entries, 4 bytes each
 */

// todo: this is wrong, PPU reads from the cartridge and only from pallettes(32), nametables(2048) and OAM(256) all of which are
const VRAM_SIZE = 0x8000;

const PALETTE = [0x666666, 0x002A88, 0x1412A7, 0x3B00A4, 0x5C007E, 0x6E0040, 0x6C0600, 0x561D00,
    0x333500, 0x0B4800, 0x005200, 0x004F08, 0x00404D, 0x000000, 0x000000, 0x000000,
    0xADADAD, 0x155FD9, 0x4240FF, 0x7527FE, 0xA01ACC, 0xB71E7B, 0xB53120, 0x994E00,
    0x6B6D00, 0x388700, 0x0C9300, 0x008F32, 0x007C8D, 0x000000, 0x000000, 0x000000,
    0xFFFEFF, 0x64B0FF, 0x9290FF, 0xC676FF, 0xF36AFF, 0xFE6ECC, 0xFE8170, 0xEA9E22,
    0xBCBE00, 0x88D800, 0x5CE430, 0x45E082, 0x48CDDE, 0x4F4F4F, 0x000000, 0x000000,
    0xFFFEFF, 0xC0DFFF, 0xD3D2FF, 0xE8C8FF, 0xFBC2FF, 0xFEC4EA, 0xFECCC5, 0xF7D8A5,
    0xE4E594, 0xCFEF96, 0xBDF4AB, 0xB3F3CC, 0xB5EBF2, 0xB8B8B8, 0x000000, 0x000000];

export class PPU {
    debugInfo: any = {
        data: [],
        lowByte: 0,
        highByte: 0,
        attribute: 0
    };

    lastVBlankCycles: number = 0;
    nes: NES;
    vram: Uint8Array;
    mirrorTable: Uint16Array;

    mapper: Mapper;
    cpu: CPU;
    memory: Memory;

    w: Uint16Array = new Uint16Array(1); // write toggle
    v: Uint16Array = new Uint16Array(1); // current address
    t: Uint16Array = new Uint16Array(1); // temp address
    
    bufferedReadValue: number = 0;
    
    paletteData: Uint8Array;
    cycle: number = 0;
    lastCycle: number = 0;

    oddFrame: boolean = false;
    scanLine: number = 0;
    frame: number = 0;

    nmiDelay: number = 0;
    register: number = 0;
    nmiPrevious: boolean = false;

    fineX: number = 0;
    spritePatterns: number[] = [];
    spritePositions: number[] = [];
    spritePriorities: number[] = [];
    spriteIndexes: number[] = [];

    flagOverflow: number = 0;
    flagZeroHit: number = 0;
    
    // todo: would be great to wrap these around UintArray8 or maybe provide getter/setter to guard against byte/word bounds
    spriteCount: number = 0;
    tileData: Uint32Array = new Uint32Array(2);
    tileIndex: number = 16;
    tileBytes: Uint8Array = new Uint8Array(2);
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
    oamData: Uint8Array;
    oamAddress: number = 0;
    v_blank: boolean = true;

    canvasElement: HTMLCanvasElement;
    debugCanvasElement: HTMLCanvasElement;
    canvas: CanvasRenderingContext2D;
    debugCanvas: CanvasRenderingContext2D;
    
    imageData: ImageData;
    debugImageData: ImageData;

    pixels: Uint8ClampedArray;
    debugPixels: Uint8ClampedArray;

    debugIndex: number;
    debugList: any[];
    constructor(nes: NES, canvas: HTMLCanvasElement, debugCanvas: HTMLCanvasElement) {

        this.debugIndex = 0;
        this.debugList = [];

        this.canvasElement = canvas;
        this.debugCanvasElement = debugCanvas;

        if (window.hasOwnProperty("TEST")) {

        } else {
            this.canvas = this.canvasElement.getContext('2d');
            this.debugCanvas = this.debugCanvasElement.getContext('2d');        
        }
                
        if (this.canvas) {
            this.imageData = this.canvas.createImageData(256, 240);
            this.pixels = this.imageData.data;

            function getMousePos(canvas: any, evt: MouseEvent) {
                var rect = canvas.getBoundingClientRect();
                return {
                    x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
                    y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
                };
            }

            addEventListener('mousemove', (e: MouseEvent) => {
                let info = getMousePos(this.canvasElement, e);
                // console.log(info, this.debugInfo.data[info.y][info.x]);
            });                    
        }

        if (this.debugCanvas) {
            this.debugImageData = this.debugCanvas.createImageData(256*2, 240);
            this.debugPixels = this.debugImageData.data;
        }

        this.nes = nes;
        this.mapper = this.nes.getMapper();
        this.cpu = this.nes.getCPU();
        this.memory = this.nes.getMemory();

        this.paletteData = new Uint8Array(32);        

        this.oamData = new Uint8Array(256);
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
    

static MirrorLookup:any = [
	[0, 0, 1, 1],
	[0, 1, 0, 1],
	[0, 0, 0, 0],
	[1, 1, 1, 1],
	[0, 1, 2, 3]
]

 MirrorAddress(mode: number, address: number): number {
	address = (address - 0x2000) % 0x1000;
	let table = Math.trunc(address / 0x0400);
    let offset = address % 0x0400;
	const finalAddr = 0x2000 + PPU.MirrorLookup[mode][table]*0x0400 + offset;
    // console.log(finalAddr);
    // if (isNaN(finalAddr)) debugger
    return finalAddr;
}


    // mirror table literally holds the address it's mirrored to
    setMirror(from: number, to: number, size: number) {
        for (let i = 0; i < size; i++)
            this.mirrorTable[from+i] = to+i;
    }

    dump(from: number, to: number) {
        let cnt = 0;
        let data = '';
        for (let i = from; i <= to; i++) {
            data += this.vram[i].toString(16).padStart(2, '0') +" ";
            cnt ++;
            cnt %= 16;

            if (cnt == 0) {
                console.log(data);
                data = '';
            }
        }

    }

    nmiChange() {
        let nmi = this.generateNMI && this.v_blank;

        if (nmi && !this.nmiPrevious)
            this.nmiDelay = 5;
            
        this.nmiPrevious = nmi;
    }
    
    readPalette(address: number) {
        if (address >= 16 && address%4 == 0) {
            address -= 16
        }

        return this.paletteData[address] & 0xFF;
    }
    
    writePalette(address: number, value: number): void {        
        if (address >= 16 && address%4 == 0) {
            address -= 16
        }
        
        this.paletteData[address] = value & 0xFF;
    }
            
    fetchSpritePattern(i: number, row: number): number {
        let tile = this.oamData[i*4+1];
        const attributes = this.oamData[i*4+2];
        let address = 0;

        if (this.controlSpriteSize == 0) {
            if ((attributes & 0x80) == 0x80) {
                row = 7 - row;
            }
            const table = this.controlSpriteTable;
            address = 0x1000*(table & 0xFFFF) + (tile & 0xFFFF)*16 + (row & 0xFFFF);
        } else {
            if ((attributes & 0x80) == 0x80) {
                row = 15 - row;
            }
            const table = tile & 1;
            tile &= 0xFE;
            if (row > 7) {
                tile++;
                row -= 8;
            }
            address = 0x1000*(table & 0xFFFF) + (tile & 0xFFFF)*16 + (row & 0xFFFF);
        }
        let a = (attributes & 3) << 2;
        let lowTileByte = this.read(address);
        let highTileByte = this.read(address + 8);
        let data: Uint32Array = new Uint32Array(1);

        for (let i = 0; i < 8; i++) {
            var p1, p2;

            if ((attributes & 0x40) == 0x40) {
                p1 = (lowTileByte & 1) << 0;
                p2 = (highTileByte & 1) << 1;
                lowTileByte >>>= 1;
                highTileByte >>>= 1;
            } else {
                p1 = (lowTileByte & 0x80) >>> 7;
                p2 = (highTileByte & 0x80) >>> 6;
                lowTileByte <<= 1;
                highTileByte <<= 1;
            }

            data[0] <<= 4;
            data[0] |= (a | p1 | p2) & 0xFFFFFFFF;
        }
        return data[0]
    }
    
    evaluateSprites() {
        let h = 0;
        if (this.controlSpriteSize == 0) {
            h = 8;
        } else {
            h = 16;
        }

        let oamData = this.oamData;
        let count = 0;
        for (let i = 0; i < 64; i++) {
            let y = oamData[i*4+0];
            let a = oamData[i*4+2];
            let x = oamData[i*4+3];
            let row = this.scanLine - y;
            if (row < 0 || row >= h) {
                continue;
            }

            if (count < 8) {
                this.spritePatterns[count] = 0xFFFFFFFF & this.fetchSpritePattern(i, row);
                this.spritePositions[count] = x;
                this.spritePriorities[count] = (a >>> 5) & 1;
                this.spriteIndexes[count] = i & 0xFF;
            }
            count++
        }

        if (count > 8) {
            count = 8;
            this.flagOverflow = 1;
        }

        this.spriteCount = count;
    }

    renderPixel() {
        const x = this.cycle - 1;
        const y = this.scanLine;
                       
        // if (window.hasOwnProperty("TEST")) // todo: slowwwwww
        //     return;            
        
        // let background = this.backgroundPixel()

        let background = 0;
        if (this.maskShowBG == 1) {
            
            const tileData = this.tileData[1];
            const data = tileData >>> ((7 - this.fineX) * 4);
            background = data & 0xF;
        }

        // let [idx, sprite] = this.spritePixel();
        let idx = 0;
        let sprite = 0;

        // we do a check to see if a sprite is nearby this pixel and if so
        // we need to calculate offset for the pixel in sprite
        if (this.maskShowSprites == 1) {
            for (let i = 0; i < this.spriteCount; i++) {
                let offset = (this.cycle - 1) - this.spritePositions[i];
                // sprite is not in this 8pixels region
                if (offset < 0 || offset > 7) {
                    continue;
                }
    
                offset = 7 - offset;
                const a = (offset*4) & 0xFF;
                let b = (this.spritePatterns[i] >>> a);

                if (DEBUG_SPRITES)
                    b = i+1;
                
                const color = b & 0x0F;

                if (color % 4 == 0 && !DEBUG_SPRITES) {
                    continue;
                }
    
                idx = i;
                sprite = color;
                break;
            }
        }

        if (x < 8 && this.maskShowLeftBG == 0) {
            background = 0;
        }
        
        if (x < 8 && this.maskShowLeftSprites == 0) {
            sprite = 0;
        }

        const b = background % 4 != 0;
        const s = sprite % 4 != 0;
        var color = 0;

        if (!b && !s) {
            color = 0;
        } else if (!b && s) {
            color = sprite | 0x10;
        } else if (b && !s) {
            color = background;
        } else {
            // both background and sprite pixels are here a collision so to speak
            if (this.spriteIndexes[idx] == 0 && x < 255) {
                this.flagZeroHit = 1;
            }
            if (this.spritePriorities[idx] == 0) {
                color = sprite | 0x10;
            } else {
                color = background;
            }
        }        

        // if (!this.debugInfo.data[y])
        //   this.debugInfo.data[y] = [];
    
        // this.debugInfo.data[y][x] = {
        //     background: background,
        //     attribute: this.debugInfo.attribute,
        //     lowByte: this.debugInfo.lowByte,
        //     highByte: this.debugInfo.highByte
        // }

        
        if (color >= 16 && color%4 == 0) {
            color -= 16
        }
        
        const fromPalette = this.paletteData[color] % 64;

        let c = PALETTE[fromPalette];

        const colr = (c >>> 16) & 0xFF;
        const colg = (c >>> 8) & 0xFF;
        const colb = c & 0xFF;
        
        let pixelIdx = (x + y*256) * 4;
        this.pixels[pixelIdx + 0] = colr;
        this.pixels[pixelIdx + 1] = colg;
        this.pixels[pixelIdx + 2] = colb;
        this.pixels[pixelIdx + 3] = 0xFF;            
    }

    copyY() {
        this.v[0] = (this.v[0] & 0x841F) | (this.t[0] & 0x7BE0)
    }

    copyX() {
        this.v[0] = (this.v[0] & 0xFBE0) | (this.t[0] & 0x041F)
    }
    
    // this is direct copy paste from: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
    incrementX() {        
        // increment hori(v)
        // if coarse X == 31
        if ((this.v[0] & 0x001F) == 31) {
            // coarse X = 0
            this.v[0] &= 0xFFE0;
            // switch horizontal nametable
            this.v[0] ^= 0x0400;
        } else {
            // increment coarse X            
            this.v[0]++;            
        }
    }
    
    // this is direct copy paste from: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
    incrementY() {        
        // increment vert(v)
        // if fine Y < 7
        if ((this.v[0] & 0x7000) != 0x7000) {
            // increment fine Y
            this.v[0] += 0x1000;
        } else {
            // fine Y = 0
            this.v[0] &= 0x8FFF;
            // let y = coarse Y
            let y = (this.v[0] & 0x03E0) >>> 5;
            if (y == 29) {
                // coarse Y = 0
                y = 0;
                // switch vertical nametable
                this.v[0] ^= 0x0800
            } else if (y == 31) {
                // coarse Y = 0, nametable not switched
                y = 0;
            } else {
                // increment coarse Y
                y++;
            }
            // put coarse Y back into v
            this.v[0] = (this.v[0] & 0xFC1F) | (y << 5);
        }
    }
    
    fetchNameTableByte() {
        const v = this.v[0];
        const address = 0x2000 | (v & 0x0FFF);
        this.nameTableByte = this.read(address);

        if (this.nameTableByte == 0xD1) {
            
        }
            // console.log(address.toString(16));
        // if (this.nameTableByte == 0x1 || this.nameTableByte == 0x9 || this.nameTableByte == 0x8) {
        //     this.debugList.push(address.toString(16));
        // } else {
        //     if (this.debugList.length > 0)
        //         console.log('==>', this.debugList);
        //     this.debugList = [];
        // }    
    }
    
    fetchAttributeTableByte() {
        let v = this.v[0];
        const address = 0x23C0 | (v & 0x0C00) | ((v >>> 4) & 0x38) | ((v >>> 2) & 0x07);
        const shift = ((v >> 4) & 4) | (v & 2);
        this.attributeTableByte = 0xFF & (((this.read(address) >>> shift) & 3) << 2);
        this.debugInfo.attribute = this.attributeTableByte;
    }
    
    fetchLowTileByte() {
        let fineY = (this.v[0] >>> 12) & 7;
        const table = this.controlBackgroundTable;  
        const tile = this.nameTableByte;
        const address = 0x1000*table + (0xFFFF & tile)*16 + fineY;
        this.tileBytes[0] = this.read(address);
        this.debugInfo.lowByte = this.tileBytes[0];
    }

    fetchHighTileByte() {
        let fineY = (this.v[0] >>> 12) & 7;
        const table = this.controlBackgroundTable;
        const tile = this.nameTableByte;
        const address = 0x1000*table + (0xFFFF & tile)*16 + fineY;
        this.tileBytes[1] = this.read(address + 8);
        this.debugInfo.highByte = this.tileBytes[1];
    }

    storeTileData() {
        let data = 0;
        const a = this.attributeTableByte & 0xFF;

        for (let i = 0; i < 8; i++) {            
            const p1 = (this.tileBytes[0] & 0x80) >>> 7;
            const p2 = (this.tileBytes[1] & 0x80) >>> 6;
            this.tileBytes[0] <<= 1;
            this.tileBytes[1] <<= 1;

            this.tileBytes[0] &= 0xFF;
            this.tileBytes[1] &= 0xFF;
            
            
            data <<= 4;
            data |= (a | p1 | p2) & 0xFFFFFFFF;            
        }        

        this.tileData[0] = data;
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
                    const val0 = (line0 >>> reduct) & 1;
                    const val1 = (line1 >>> reduct) & 1;                        
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
                    const val0 = (line0 >>> reduct) & 1;
                    const val1 = (line1 >>> reduct) & 1;                        
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
        // @ts-ignore
        // if (window.hasOwnProperty('TEST'))
        //     return;
        
        if (DEBUG_OAM) {
            for(let i = 0; i < this.oamData.length; i+=4) {
                const y = this.oamData[i];
                const x = this.oamData[i+3];
                // if (this.oamData[i+1] != 0)
                //     console.log(i / 4, '=>', this.oamData[i+1].toString(16), '->', x, y);
                const offset = (y*256+x) * 4;
                let val = 100 + Math.random() * 156;
                this.pixels[offset + 0] = val;
                this.pixels[offset + 1] = val;
                this.pixels[offset + 2] = val;
                this.pixels[offset + 3] = 0xFF;                
            }
        }

        this.canvas.putImageData(this.imageData, 0, 0);
        
        // this.debugRenderSprites();
        // this.debugCanvas.putImageData(this.debugImageData, 0, 0);        
    }

    step(times: number) {
        for (let i = 0; i < times; i++) {
            
            this.lastCycle = this.cycle;
            
            // this.tick();
            if (this.nmiDelay > 0) {
                this.nmiDelay--;
                if (this.nmiDelay == 0 && this.v_blank && this.generateNMI) {
                    // console.log('nmi');
                    this.cpu.triggerNMI();
                }
            }

            let reseted = false;
            if (this.maskShowBG == 1 || this.maskShowSprites == 1) {
                if (this.oddFrame && this.scanLine == 261 && this.cycle == 339) {
                    this.cycle = 0;
                    this.scanLine = 0;
                    this.frame++;
                    this.oddFrame = !this.oddFrame;
                    reseted = true;
                }
            }

            if (!reseted) {
                this.cycle++;
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

            const cycleDiff = Math.abs(this.lastCycle - this.cycle);
            // console.assert(cycleDiff == 1|| cycleDiff == 340 || cycleDiff == 339, cycleDiff.toString());
            
            let render = this.maskShowBG == 1 || this.maskShowSprites == 1;
            let preLine = this.scanLine == 261;
            let visibleLine = this.scanLine < 240;
            let renderLine = preLine || visibleLine;
            let preFetchCycle = this.cycle >= 321 && this.cycle <= 336;
            let visibleCycle = this.cycle >= 1 && this.cycle <= 256;
            let fetchCycle = preFetchCycle || visibleCycle;

            // background logic
            if (render) {
                if (visibleLine && visibleCycle) {
                    this.renderPixel();
                }

                if (renderLine && fetchCycle) {
                    this.tileData[1] = (this.tileData[1] << 4) | ((this.tileData[0] >>> 28) & 0xF);
                    this.tileData[0] = this.tileData[0] << 4;
                    
                    switch (this.cycle % 8) {
                        case 1:
                            this.fetchNameTableByte(); break;
                        case 3:
                            this.fetchAttributeTableByte(); break;
                        case 5:
                            this.fetchLowTileByte(); break;
                        case 7:
                            this.fetchHighTileByte(); break;
                        case 0:
                            this.storeTileData(); break;
                    }
                }

                if (preLine && this.cycle >= 280 && this.cycle <= 304) {
                    this.copyY();
                }
                
                if (renderLine) {
                    if (fetchCycle && (this.cycle % 8 == 0)) {
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

            // sprite logic
            if (render) {
                if (this.cycle == 257) {
                    if (visibleLine) {
                        this.evaluateSprites()
                    } else {
                        this.spriteCount = 0
                    }
                }
            }
            
            if (this.scanLine == 241 && this.cycle == 1) {
                this.setVerticalBlank();              
            }

            if (preLine && this.cycle == 1) {
                this.clearVerticalBlank();                      
                this.flagZeroHit = 0;
                this.flagOverflow = 0;
            }
        }  
    }

    readStatus(poke: boolean): number {                
        let result: number = this.register & 0x1F;
        
        if (this.flagOverflow == 1)
            result |= 1 << 5;
        
        if (this.flagZeroHit == 1)
            result |= 1 << 6;
        
        if (this.v_blank)
            result |= 1 << 7;
        
        if (!poke) {
            this.v_blank = false;
            this.nmiChange();
            this.w[0] = 0;
        }

                
        return result;
    }    

    writeScroll(value: any) {

        if (this.w[0] == 0) {
            // t: ....... ...HGFED = d: HGFED...
            // x:              CBA = d: .....CBA
            // w:                  = 1            
            this.t[0] = (this.t[0] & 0xFFE0) | ((value & 0xFFFF) >>> 3)
            this.fineX = value & 0x07;
            this.w[0] = 1;
        } else {
            // t: CBA..HG FED..... = d: HGFEDCBA
            // w:                  = 0
            this.t[0] = (this.t[0] & 0x8FFF) | (((value & 0xFF) & 0x07) << 12); // CBA part
            this.t[0] = (this.t[0] & 0xFC1F) | (((value & 0xFFFF) & 0xF8) << 2);  // HGFED part
            this.w[0] = 0;            
        }
    }

    writeRegister(addr: number, value: number): void {
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
        } else if (addr == 0x2005) {
            this.writeScroll(value);
        } else if (addr == 0x2006) {
            this.writeAddress(value);
        } else if (addr == 0x2007) {
            this.writeToAddress(value);
        } else if (addr == 0x4014) {
            this.writeDMA(value);
        }
    }    

    readRegister(addr: number, poke: boolean = false): number {
        if (addr == 0x2000) {
            console.error("DONT DO THAT 0x2000");
        } else if (addr == 0x2002) {            
            return this.readStatus(poke);
        } else if (addr == 0x2001) {
            console.error("DONT DO THAT 0x2001");
        } else if (addr == 0x2003) {
            return this.readOAMAddress(addr, poke);
        } else if (addr == 0x2004) {
            return this.readOAMData();
        } else if (addr == 0x2005) {
            console.error("DONT DO THAT 0x2005");
            return 0; // todo: this code should not exist. it's used for CPU debugging to show value at memory. It should show nothing for this specific address and few others
        } else if (addr == 0x2006) {
            console.error("DONT DO THAT 0x2006");
        } else if (addr == 0x2007) {
            return this.readFromAddress(poke);
        } else if (addr == 0x4014) {
            debugger;
            console.error("DONT DO THAT 0x4014");
            return 0;
        }
    }
    
    read(addr: number, poke: boolean = false): number {        
        addr = addr % 0x4000;

        if (addr < 0x2000) {
            let x = this.mapper.read(addr, poke) & 0xFF; 
            // console.log("from ", addr.toString(16), '->', x.toString(16));
            return x;
        } else if (addr < 0x3F00) {
            let mode = this.nes.getROM().getMirror();
            return this.vram[ this.MirrorAddress(mode, addr) % 2048] & 0xFF; // todo: mirror  , probably cia bugas del lode runnerio crasho, nes mirrorinimas neveikia, tai cia vejus nuskaito ir undefined gaunas      
        } else if (addr < 0x4000) {
            return this.readPalette(addr % 32);
        } else {
            // return this.vram[addr] & 0xFF;
            throw new Error("Should not be accessed");
        }
    }

    write(addr: number, value: number): void {
        addr = addr % 0x4000;
        if (addr < 0x2000) {
            // throw new Error("Cant write to mapper! yet");
            // this.nes.getMapper().write(addr, value, poke);
        } else if (addr < 0x3F00) {
            let mode = this.nes.getROM().getMirror();
            this.vram[ this.MirrorAddress(mode, addr) % 2048] = value; // todo: mirroring
        } else if (addr < 0x4000) {
            this.writePalette(addr % 32, value);
        }
    }

    writeToAddress(value: number): void {        
        this.write(this.v[0], value);
        this.v[0] += this.controlIncrement ? 32 : 1;
    }

    readFromAddress(poke: boolean): number {
        let t = this.read(this.v[0]);

        if (( this.v[0] % 0x4000) <= 0x3EFF) {
            let buf = this.bufferedReadValue;
            this.bufferedReadValue = t;
            t = buf;
        } else {
            this.bufferedReadValue = this.read(this.v[0] - 0x1000);
        }

        this.v[0] += this.controlIncrement ? 32 : 1;

        return t;
    }

    writeAddress(value: number): void {
        value &= 0xFF;

        if (this.w[0] == 0) {
            // t: .FEDCBA ........ = d: ..FEDCBA
            // t: X...... ........ = 0
            // w:                  = 1
            this.t[0] = (this.t[0] & 0x80ff) | ((value & 0x3F) << 8);
            this.w[0] = 1;
        } else {
            // t: ....... HGFEDCBA = d: HGFEDCBA
            // v                   = t
            // w:                  = 0
            this.t[0] = (this.t[0] & 0xFF00) | (0xFFFF & value);
            this.v[0] = this.t[0];
            this.w[0] = 0;
        } 
    }
    
    setVerticalBlank() {
        this.v_blank = true;
        this.lastVBlankCycles = this.cycle * this.scanLine;
        this.nmiChange();
    }

    clearVerticalBlank() {
        this.v_blank = false;
        this.nmiChange();
    }

    writeControl(value: number): void {
        // console.log('write ctrl', value.toString(2));

        this.controlNameTable =   ((value >>> 0) & 3);
        this.controlIncrement =   ((value >>> 2) & 1);
        this.controlSpriteTable = ((value >>> 3) & 1);
        this.controlBackgroundTable = ((value >>> 4) & 1);
        
        this.controlSpriteSize =      ((value >>> 5) & 1);
        this.controlMasterSlave =     ((value >>> 6) & 1);
        this.generateNMI =            ((value >>> 7) & 1) == 1;
        
        this.t[0] = ((this.t[0] & 0xF3FF) | ((value & 0xFFFF) & 0x03) << 10);
        this.nmiChange();
    }
    
    writeMask(value: number): void {
        // console.log('write mask', value.toString(2));
        this.maskGrayscale = (value & 1) & 1;
        this.maskShowBG = (value >>> 3) & 1;
        this.maskShowSprites = (value >>> 4) & 1;
        this.maskShowLeftBG = (value >>> 1) & 1;
        this.maskShowLeftSprites = (value >>> 2) & 1;
    }

    writeOAMAddress(value: number): void {
        this.oamAddress = value & 0xFFFF;
    }

    writeOAMData(value: number): void {
        this.oamData[this.oamAddress] = value & 0xFFFF;
        this.oamAddress++;    
    }

    writeDMA(value: number): void {     
        let cpu = this.cpu;
        let memory = this.memory;

        let addr = value << 8;
        for (let i = 0; i < 256; i++) {
            let val = memory.read(addr);
            this.oamData[this.oamAddress] = val;
            this.oamAddress++;
            addr++;
        }
        
        let stall: number = 513;
        if (cpu.cycles % 2 == 1)
            stall++;

        this.cpu.setStall(stall);
    }
    
    readOAMAddress(value: number, poke: boolean): number {
        return this.oamAddress;
    }

    readOAMData(): number {
        return this.oamData[this.oamAddress];
    }    
}