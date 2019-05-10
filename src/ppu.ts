import { NES } from "./nes";
import { CPU } from "./cpu";
import { Utils } from "./utils";

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

    w: boolean = false; // write toggle
    v: number = 0;      // current address
    t: number = 0;      // temp address
    
    bufferedReadValue: number;
    
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

    flagOverflow: boolean = false;
    flagZeroHit: boolean = false;
    
    // todo: would be great to wrap these around UintArray8 or maybe provide getter/setter to guard against byte/word bounds
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

    constructor(nes: NES, canvas: HTMLCanvasElement, debugCanvas: HTMLCanvasElement) {
        this.canvasElement = canvas;
        this.debugCanvasElement = debugCanvas;
        this.canvas = this.canvasElement.getContext('2d');
        this.debugCanvas = this.debugCanvasElement.getContext('2d');
        

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
    
    evaluateSprites() {

    }

    fetchTileData() {
        return (this.tileData >> 32) & 0xFFFFFFFF;
    }

    backgroundPixel() {
        if (this.maskShowBG == 0) {
            return 0;
        }
        
        const data = this.fetchTileData() >> ((7 - this.fineX) * 4);
        return data & 0x0F;
    }
    
    renderPixel() {
        const x = this.cycle - 1;
        const y = this.scanLine;
        
        let background = this.backgroundPixel();
            
        if (!this.debugInfo.data[y])
            this.debugInfo.data[y] = [];


    // renderingEnabled := ppu.flagShowBackground != 0 || ppu.flagShowSprites != 0
	// preLine := ppu.ScanLine == 261
	// visibleLine := ppu.ScanLine < 240
	// // postLine := ppu.ScanLine == 240
	// renderLine := preLine || visibleLine
	// preFetchCycle := ppu.Cycle >= 321 && ppu.Cycle <= 336
	// visibleCycle := ppu.Cycle >= 1 && ppu.Cycle <= 256
	// fetchCycle := preFetchCycle || visibleCycle


        this.debugInfo.data[y][x] = {
            background: background,
            attribute: this.debugInfo.attribute,
            lowByte: this.debugInfo.lowByte,
            highByte: this.debugInfo.highByte
        }

        if (window.hasOwnProperty("TEST"))
            return;            

        if (x < 8 && this.maskShowLeftBG == 0) {
            background = 0;
        }
        
        var color = background % 4 != 0 ? background : 0;
        
        // const b = background % 4 != 0;
        // const s = 0;// todo sprite % 4 != 0;
        // var color = 0;
        // if (!b && !s) {
        //     color = 0
        // } else if (!b && s) {
        //     color = 0; // todo sprite | 0x10;
        // } else if (b && !s) {
        //     color = background;
        // } else {
        //     color = background;
        // }

        let c = PALETTE[this.readPalette(color) % 64];

        const colr = (c >> 16) & 0xFF;
        const colg = (c >> 8) & 0xFF;
        const colb = c & 0xFF;
        
        let pixelIdx = (x + y*256) * 4;
        this.pixels[pixelIdx + 0] = colr;
        this.pixels[pixelIdx + 1] = colg;
        this.pixels[pixelIdx + 2] = colb;
        this.pixels[pixelIdx + 3] = 0xFF;            
    }

    copyY() {
        this.v = (this.v & 0x841F) | (this.t & 0x7BE0)
    }

    copyX() {
        this.v = (this.v & 0xFBE0) | (this.t & 0x041F)
    }
    
    // this is direct copy paste from: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
    incrementX() {
        // increment hori(v)
        // if coarse X == 31
        if ((this.v & 0x001F) == 31) {
            // coarse X = 0
            this.v &= 0xFFE0;
            // switch horizontal nametable
            this.v ^= 0x0400;
        } else {
            // increment coarse X            
            this.v++;            
        }
    }
    
    // this is direct copy paste from: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
    incrementY() {
        // increment vert(v)
        // if fine Y < 7
        if ((this.v & 0x7000) != 0x7000) {
            // increment fine Y
            this.v += 0x1000;
        } else {
            // fine Y = 0
            this.v &= 0x8FFF;
            // let y = coarse Y
            let y = (this.v & 0x03E0) >> 5;
            if (y == 29) {
                // coarse Y = 0
                y = 0;
                // switch vertical nametable
                this.v ^= 0x0800
            } else if (y == 31) {
                // coarse Y = 0, nametable not switched
                y = 0;
            } else {
                // increment coarse Y
                y++;
            }
            // put coarse Y back into v
            this.v = (this.v & 0xFC1F) | (y << 5);
        }
    }

    static DDD: number = 0;

    static nms = new Set();

    fetchNameTableByte() {
        const v = this.v;
        const address = 0x2000 | (v & 0x0FFF);
        this.nameTableByte = this.read(address);
        
        if (this.nameTableByte == 0xF0) {
            this.nameTableByte = 0x24;
        } else if (this.nameTableByte == 0xF1) {
            this.nameTableByte = 0x24;
        }
        
        if (!PPU.nms.has(this.nameTableByte))
        PPU.nms.add(this.nameTableByte);
        
        PPU.DDD++;
        PPU.DDD %= 2;
        
        if (PPU.DDD == 0) {
            // this.nameTableByte = 0x0C;
        } else if (PPU.DDD == 1) {
            // this.nameTableByte = 0x24;
        }
    }

    // v := ppu.v
	// address := 0x23C0 | (v & 0x0C00) | ((v >> 4) & 0x38) | ((v >> 2) & 0x07)
	// shift := ((v >> 4) & 4) | (v & 2)
    // ppu.attributeTableByte = ((ppu.Read(address) >> shift) & 3) << 2
    
    fetchAttributeTableByte() {
        let v = this.v;
        const address = 0x23C0 | (v & 0x0C00) | ((v >> 4) & 0x38) | ((v >> 2) & 0x07);
        const shift = ((v >> 4) & 4) | (v & 2);
        this.attributeTableByte = 0xFF & (((this.read(address) >> shift) & 3) << 2);
        this.debugInfo.attribute = this.attributeTableByte;
    }
    
    fetchLowTileByte() {
        let fineY = (this.v >> 12) & 7;
        const table = this.controlBackgroundTable;
        console.assert(table < 2);
        
        const tile = this.nameTableByte;
        // if (tile == 0x0C) console.log("======= 0x0C")
        const address = 0x1000*table + tile*16 + fineY;
        this.lowTileByte = this.read(address);
        this.debugInfo.lowByte = this.lowTileByte;
    }

    fetchHighTileByte() {
        let fineY = (this.v >> 12) & 7;
        const table = this.controlBackgroundTable;
        const tile = this.nameTableByte;
        // if (tile == 0x0C) debugger

        const address = 0x1000*table + tile*16 + fineY;
        this.highTileByte = this.read(address + 8);
        this.debugInfo.highByte = this.highTileByte;
    }

    storeTileData() {
        let data = 0;
        const a = this.attributeTableByte & 0xFF;

        if (this.nameTableByte == 0xF4) {
            // console.log('->', this.lowTileByte.toString(2).padStart(8, '0'));
            console.log('->', this.lowTileByte.toString(2).padStart(8, '0'));
            
        }
        for (let i = 0; i < 8; i++) {            
            const p1 = (this.lowTileByte & 0x80) >> 7;
            const p2 = (this.highTileByte & 0x80) >> 6;
            this.lowTileByte <<= 1;
            this.highTileByte <<= 1;

            this.lowTileByte &= 0xFF;
            this.highTileByte &= 0xFF;
            
            data = data << 4;
            data |= (a | p1 | p2) & 0xFFFFFFFF;
        }
        
        this.tileData |= data; 
        if (this.nameTableByte == 0x2) {
            console.log(this.tileData.toString(2).padStart(32, '0'));
        }
    }

    tick() {        
        if (this.nmiDelay > 0) {
            this.nmiDelay--;
            if (this.nmiDelay == 0 && this.v_blank && this.generateNMI) {
                // console.log('nmi');
                this.nes.getCPU().triggerNMI();
            }
        }

        if (this.maskShowBG == 1 || this.maskShowSprites == 1) {
            if (this.oddFrame && this.scanLine == 261 && this.cycle == 339) {
                this.cycle = 0;
                this.scanLine = 0;
                this.frame++;
                this.oddFrame = !this.oddFrame;
                return;
            }
        }

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
        throw new Error("Direct rendering is not used anymore");
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
        // @ts-ignore
        if (window.hasOwnProperty('TEST'))
            return;
        
        this.debugRenderSprites();
        this.canvas.putImageData(this.imageData, 0, 0);
        this.debugCanvas.putImageData(this.debugImageData, 0, 0);        
    }

    step() {
        this.lastCycle = this.cycle;
        this.tick();
        const cycleDiff = Math.abs(this.lastCycle - this.cycle);
        console.assert(cycleDiff == 1|| cycleDiff == 340 || cycleDiff == 339, cycleDiff.toString());
        
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
                this.tileData <<= 4;
                
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
            this.flagZeroHit = false;
            this.flagOverflow = false;
        }
               
    }

    readStatus(poke: boolean): number {        
        console.assert(!poke);
        
        let result: number = this.register & 0x1F;
        
        if (this.flagOverflow)
            result |= 1 << 5;
        
        if (this.flagZeroHit)
            result |= 1 << 6;
        
        if (this.v_blank)
            result |= 1 << 7;
        
        if (!poke) {
            this.v_blank = false;
            this.nmiChange();
            this.w = false;
        }

                
        return result;
    }    

    writeScroll(value: any) {
        if (this.w) {       
            // t: CBA..HG FED..... = d: HGFEDCBA
            // w:                  = 0
            this.t = (this.t & 0x8FFF) | (((value & 0xFF) & 0x07) << 12); // CBA part
            this.t = (this.t & 0xFC1F) | (((value & 0xFF) & 0xF8) << 2);  // HGFED part
        } else {
            // t: ....... ...HGFED = d: HGFED...
            // x:              CBA = d: .....CBA
            // w:                  = 1            
            this.t = (this.t & 0xFFE0) | ((value & 0xFF) >> 3)
            this.fineX = value & 0x07;
        }

        this.w = !this.w;
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
            return this.readControl(addr, poke);
        } else if (addr == 0x2002) {            
            return this.readStatus(poke);
        } else if (addr == 0x2001) {
            return this.readMask(addr, poke);
        } else if (addr == 0x2003) {
            return this.readOAMAddress(addr, poke);
        } else if (addr == 0x2004) {
            return this.readOAMData();
        } else if (addr == 0x2005) {
            return 0; // todo: this code should not exist. it's used for CPU debugging to show value at memory. It should show nothing for this specific address and few others
        } else if (addr == 0x2006) {
            return this.readAddress(addr, poke);
        } else if (addr == 0x2007) {
            return this.readFromAddress(poke);
        } else if (addr == 0x4014) {
            return this.readDMA(addr, poke);
        }
    }
    
    read(addr: number, poke: boolean = false): number {        
        addr = addr % 0x4000;

        if (addr < 0x2000) {
            let x = this.nes.getMapper().read(addr, poke) & 0xFF; 
            // console.log("from ", addr.toString(16), '->', x.toString(16));
            return x;
        } else if (addr < 0x3F00) {
            return this.vram[addr] & 0xFF; // todo: mirror  , probably cia bugas del lode runnerio crasho, nes mirrorinimas neveikia, tai cia vejus nuskaito ir undefined gaunas      
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
            this.vram[addr] = value; // todo: mirroring
        } else if (addr < 0x4000) {
            this.writePalette(addr % 32, value);
        }
    }

    writeToAddress(value: number): void {        
        this.write(this.v, value);
        this.v += this.controlIncrement ? 32 : 1;
    }

    readFromAddress(poke: boolean): number {
        let t = this.read(this.v);

        if (this.v % 0x4000 <= 0x3EFF) {
            let buf = this.bufferedReadValue;
            this.bufferedReadValue = t;
            t = buf;
        } else {
            this.bufferedReadValue = this.read(this.v - 0x1000);
        }

        this.v += this.controlIncrement ? 32 : 1;

        if (t == undefined) debugger
        return t;
    }

    writeAddress(value: number): void {
        value &= 0xFF;

        if (!this.w) {
            // t: .FEDCBA ........ = d: ..FEDCBA
            // t: X...... ........ = 0
            // w:                  = 1
            this.t = (this.t & 0x80ff) | ((value & 0x3F) << 8);
        } else {
            // t: ....... HGFEDCBA = d: HGFEDCBA
            // v                   = t
            // w:                  = 0
            this.t = (this.t & 0xFF00) | value;
            this.v = this.t;
        } 

        this.w = !this.w;
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

        this.controlNameTable =   ((value >> 0) & 3);
        this.controlIncrement =   ((value >> 2) & 1);
        this.controlSpriteTable = ((value >> 3) & 1);
        this.controlBackgroundTable = ((value >> 4) & 1);
        
        this.controlSpriteSize =      ((value >> 5) & 1);
        this.controlMasterSlave =     ((value >> 6) & 1);
        this.generateNMI =            ((value >> 7) & 1) == 1;
        
        this.t = 0xFFFF & ((this.t & 0xF3FF) | ((value & 0xFF) & 0x03) << 10);
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

    readOAMData(): number {
        return this.oamData[this.oamAddress];
    }

    readDMA(value: number, poke: boolean): number {
        return 1;
    }
}