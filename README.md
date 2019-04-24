Troubles went through and lessons learned
* When I started making this emulator at first of course I needed the CPU, it's the most basic and tedious thing
to implement(I thought so until I started to do PPU). What made me safe a lot of time in the long run was - make
automated test from nestest rom which I could run with a simple command ```npm run test```. This on my development machine
which is Macbook Air 2016, takes around 7 seconds to finish parsing the whole log. I could probably even shave it down much 
more but it's really quick enough. So once I implemented the test I would just give it a spin, see which command fails then
go implement/fix that command. Later on I encountered performance issue and this automated test proved itself worthy yet again when
I refactored a lot of CPU code.


----------- TODO --------------
[x] - add official rom tests just add to gitignore to avoid legal issues
[ ] - Check all the info - PRGROM and CHRROM as this caused major headache with tests
[ ] - given a test input sequence with timings(based on cpu cycles executed) compare CPU and PPU data
[ ] - donkey kong logo is improper
[ ] - donkey kong nametables are improper
[ ] - bkg.nes tiles are wrong but controller works
[ ] - balloon fight title is good but the controller doesn't work
