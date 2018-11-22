import * as _ from "lodash";

const width = 400;
const height = 320;
const asciiSize = 8;
const asciiW = width / asciiSize;
const asciiH = height / asciiSize;

const ascii = "-|/\\";

class RGBA {
    r: number;
    g: number;
    b: number;
    a: number;

    constructor(r: number, g: number, b: number, a: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;        
    }
}

class Position {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

class MutationEntry {
    position: Position;
    ascii: string;
}

class Mutation {
    data: MutationEntry[] = [];
    score: number;

    pushRandomEntry() {        
        let me = new MutationEntry();
        me.position = new Position(Math.floor(Math.random()*asciiW), Math.floor(Math.random()*asciiH));        
        me.ascii = _.sample(ascii);
        this.data.push(me);
    }

    randomModify() {
        if (Math.random() > 0.5)
            this.modifyRandomLetter();

        if (Math.random() > 0.5)
            this.modifyRandomPosition();

        // if (Math.random() > 0.001)
        //     this.pushRandomEntry();
    }

    modifyRandomLetter() {    
        _.sample(this.data).ascii = _.sample(ascii);
    }

    modifyRandomPosition() {
        _.sample(this.data).position.x = Math.floor(Math.random()*asciiW;
        _.sample(this.data).position.y = Math.floor(Math.random()*asciiH;
    }

    cross(mutation: Mutation) {
        for (let i = 0; i < Math.floor(Math.random()*mutation.data.length); i++) {
            let _entry = _.sample(mutation.data);
            let entry = _.sample(this.data);

            entry.ascii = _entry.ascii;
            entry.position.x = _entry.position.x;
            entry.position.y = _entry.position.y;                        
        }
    }
}

export class Editor {
    originalImageCanvas: HTMLCanvasElement;
    originalImageCtx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    canvasCtx: any;
    mutations: Mutation[];

    init(canvasId: string, imageId: string, width: number, height: number) {        
        var img = document.getElementById(imageId) as HTMLImageElement;

        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.canvasCtx = this.canvas.getContext('2d');
        
        this.originalImageCanvas = document.createElement('canvas');
        // document.body.appendChild(this.originalImageCanvas); // uncomment to see original image drawn into a canvas
        this.originalImageCanvas.width = img.width;
        this.originalImageCanvas.height = img.height;
        this.originalImageCtx = this.originalImageCanvas.getContext('2d');
        this.originalImageCtx.drawImage(img, 0, 0, img.width, img.height);        
        console.log(img.width, img.height);

        // console assert for size match        
        // document.getElementById(id).style = `width: ${width}px; height: ${height}px`;
        // document.getElementById(id).width = width;
        // document.getElementById(id).height = width;
        
        this.canvasCtx.font = '10px monospace';                
    }

    generateNewMutation(): Mutation {
        let mutation = new Mutation();
        for (let i = 0; i < 10; i++)
            mutation.pushRandomEntry();

        return mutation;
    }

    getColorFromData(data: Uint8ClampedArray, x: number, y: number):RGBA {
        let idx = (y*width+x)*4;
        let r = data[idx+0];
        let g = data[idx+1];
        let b = data[idx+2];
        let a = data[idx+3];
        return new RGBA(r, g, b, a);
    }

    calculateScore(mutation: Mutation):number { 
        let score:number = 0;
        this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
        // fill in all the data
        for (let entry of mutation.data) {
            this.canvasCtx.fillText(entry.ascii, entry.position.x*asciiSize, entry.position.y*asciiSize);
        }

        // check the pixels
        var newPixelData: Uint8ClampedArray = this.canvasCtx.getImageData(0, 0, width, height).data;
        var originalPixelData: Uint8ClampedArray = this.originalImageCtx.getImageData(0, 0, width, height).data;
        
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {                
                let newColor = this.getColorFromData(newPixelData, i, j);
                let originalColor = this.getColorFromData(originalPixelData, i, j);                
                
                if (newColor.a == originalColor.a) {                    
                    score += 1;
                }
            }            
        }
        
        mutation.score = score;
        return score;
    }

    run() {
        let mut1 = this.generateNewMutation();
        let mut2 = this.generateNewMutation();

        for (let i = 0; i < 10000; i++) {
            let score1 = this.calculateScore(mut1);
            let score2 = this.calculateScore(mut2);

            console.log(`Iteration ${i} scores: ${score1} and ${score2}`)
            
            if (score1 > score2 ) {
                mut2.cross(mut1);
                mut2.randomModify();
            } else {
                mut1.cross(mut2);
                mut1.randomModify();
            }
        }
        
        debugger;
    }


}
