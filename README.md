Troubles went through and lessons learned
* When I started making this emulator at first of course I needed the CPU, it's the most basic and tedious thing
to implement(I thought so until I started to do PPU). What made me safe a lot of time in the long run was - make
automated test from nestest rom which I could run with a simple command ```npm run test```. This on my development machine
which is Macbook Air 2016, takes around 7 seconds to finish parsing the whole log. I could probably even shave it down much 
more but it's really quick enough. So once I implemented the test I would just give it a spin, see which command fails then
go implement/fix that command. Later on I encountered performance issue and this automated test proved itself worthy yet again when
I refactored a lot of CPU code.


----------- TODO --------------
So this emulator is has working CPU, UNROM mapper and PPU or it seems so. 
It runs bomberman and Lode Runner perfectly, totally fails to run SMB or ice climbers
it somehow doesnt see the correct starting vector in both cases(fetches 0xFFFF).
Another issue is that balloon fight works just perfectlu uexcept cotroller doesn't work
and Donkey Kong has garbage on the title screen and a bit garbage inside the game itself.

This leads to suspect CPU/RAM totally however I've spent whole week's evening and it's just not going anywhere


instr-test-5 seems to be helpful however it seems
it has loading problems related to
SMB and IC so fixing those makes sense