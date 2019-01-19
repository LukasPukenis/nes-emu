const fs = require('mz/fs');
import { NES } from '../src/nes';

declare var __dirname: any;

test("nestest.nes rom", async () => {
    try {
        const data = await fs.readFile(__dirname + '/nestest.log');
        let whole = data.toString();
        let lines = whole.split('\n');

        let nes = new NES();
        await nes.load('tests/nestest.nes');

        for (let line of lines) {            
            nes.step();
            let dump = nes.dump();                        
            line = line.replace(/(\s{3,})/g, '  ').split('  ');
            
            let lineA = line.join(' ');
            let lineB = dump.join(' ');

            expect(lineB).toEqual(lineA);            
        }
    } catch(e) {
        throw e;
    }
});
