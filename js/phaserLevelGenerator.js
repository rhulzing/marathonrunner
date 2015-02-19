var Tile = function(){
    this.x = 0;
    this.y = 0;
    this.tileId = null;

    this.init = function(x,y,id){
        this.x = x;
        this.y = y;
        this.tileId = id;
        return this;
    }
};

var TilePatch = function(){
    this.origin = {x:0,y:0};

    // Needs to be initialized to be a 2D array
    this.tiles = [];
    this.tilesHigh = 0;
    this.tilesWide = 0;

    this.init = function(x,y,width,height, tileId){
        this.origin.x = x;
        this.origin.y = y;

        this.tilesHigh = height;
        this.tilesWide = width;
        this.tiles = [];

        for(var i = 0; i < width; i++)
        {
            var column = [];

            for(var j = 0; j < height; j++)
            {
                column.push(new Tile().init(i,j, tileId));
            }
            this.tiles.push(column);
        }

        return this;
    };
};

var phaserLevelGenerator = function(phaserGame, levelName)
{
    this.background1 = null;
    this.background2 = null;
    this.background3 = null;

    this.foreground = null;
    this.collision = null;

    this.collisionObjects = [];

    this.playerStart = {x:0, y:0};

    this.game = phaserGame;
    this.level = this.game.add.tilemap(levelName);
    this.level.addTilesetImage('forest');
    this.level.addTilesetImage('metatiles32x32');

    this.generatePatchColumn = function(height, segmentLengths, segmentData){
        var patch = new TilePatch().init(0,0,1,height);
        var index = 0;
        for(var i = 0; i < segmentLengths.length; i++)
        {
            for(var j = 0; j < segmentLengths[i]; j++)
            {
                patch.tiles[0][index++].tileId = segmentData[i];
            }
        }
        return patch;
    };

    this.generatePlatform = function(width, height, tileId, tileId2){
        var patch = new TilePatch().init(0,0,width,height);
        for(var i = 0; i < width; i++)
        {
            for(var j = 0; j < height; j++)
            {
                patch.tiles[i][j].tileId = j == 0 ? tileId : tileId2 || tileId;
            }
        }
        return patch;
    }

    var getRandom = function(min,max){
        return Math.floor(Math.random() * (max-min) + min);
    };

    var randomIntervalGenerator = function(){
        this.intervalLeft = 0;
        this.minInterval = 1;
        this.maxInterval = 1;

        this.tick = function(){
            this.intervalLeft--;
            if(this.intervalLeft <= 0){
                this.onReset();
                this.intervalLeft = getRandom(this.minInterval, this.maxInterval);
            }
            
        };
        this.onReset = function(){};

        this.init = function(min,max,onReset){

            this.minInterval = min;
            this.maxInterval = max;
            this.intervalLeft = getRandom(me.minInterval, me.maxInterval);
            this.onReset = onReset || me.onReset;

            return this;
        }
    };

    var GetTopHeightIndex = function(level, layer, column){
        for(var i = 0; i < Math.ceil(layer.width/32); i++)
        {
            if(level.getTile(column, i, layer) !== null)
            {
                return i;
            }
        }
        return Math.ceil(layer.height/32) - 1;
    };

    var applyPatch = function(patch, level, layer){
        for(var i = 0; i < patch.tilesWide; i++)
        {
            for(var j = 0; j < patch.tilesHigh; j++)
            {
                var patchTile = patch.tiles[i][j];
                // If it's not null, because 0 might be a valid item
                if(patchTile.tileId !== null){
                    //layer.setTile(patchTile.x + patch.origin.x, patchTile.y + patch.origin.y, patchTile.tileId);
                    
                    //console.log("applyPatch layer name: "+layer.name);
                    //console.log("applyPatch layer: "+layer.width);
                    level.putTile(patchTile.tileId, patchTile.x + patch.origin.x, patchTile.y + patch.origin.y, layer);
                }
            }
        }
    };


    var randomPick = function(choices){
        return choices[getRandom(0, choices.length)];
    };

    this.addCollisionObject = function(object)
    {
        // We will just assume for now that the object being pushed on is valid.
        //console.log(object);
        this.collisionObjects.push(object);
        //this.collisionObjects = object;
    };

    this.update = function()
    {
        this.game.physics.arcade.collide(this.collisionObjects, this.collision);
    };

    this.generateLevel = function()
    {
        var tilesets = this.level.tilesets;
        //var layers = this.level.layers;
        
        // Retrieve the tile sets.
        //var mountainTS = null; // not used...
        var forestTS = null
        var metaTS = null;
        for(var i = 0; i < tilesets.length; i++){
            //if(tilesets[i].name == "mountains")
            //{
            //    mountainTS = tilesets[i];
            //}
            if(tilesets[i].name == "forest")
            {
                forestTS = tilesets[i];
            }
            else if(tilesets[i].name == "metatiles32x32")
            {
                metaTS = tilesets[i];
            }
        }

        // Retrieve the tile layers
        // Order matters! it determines the layer order of the map.
        this.background3 = this.level.createLayer("Background3");
        this.background2 = this.level.createLayer("Background2");
        this.background1 = this.level.createLayer("Background1");
        this.collision = this.level.createLayer("collision");
        this.foreground = this.level.createLayer("Foreground");

        // Parallaxing!
        this.background3.scrollFactorX = 0.1;
        this.background2.scrollFactorX = 0.5;

        //this.level.setCollisionByExclusion([], true, this.collision);
        this.level.setCollisionByExclusion([], true, this.foreground);

        // resize the world so our whole map can fit.
        this.background3.resizeWorld();
        var TL = tileIdLibrary;

        var platformIndex = 0;
        var platformLength = 0, lengthMin = 2, lengthMax = 6;
        var platformHeight = 0, heightMin = 1, heightMax = 5;
        var airLength = 0, airMin = 2, airMax = 4;
        
        // build platforms
        while(platformIndex < this.level.width - 1){
            

            platformLength = getRandom(lengthMin, lengthMax) + 1;
            platformHeight = getRandom(heightMin, heightMax);

            if(this.level.width <= platformIndex + platformLength)
            {
                platformLength = this.level.width - platformIndex;
            }

            var gPlatform = this.generatePlatform(platformLength, this.level.height - platformHeight - 1, forestTS.firstgid + TL.forest.ground.top, forestTS.firstgid + TL.forest.ground.mid);
            var cPlatform = this.generatePlatform(platformLength, this.level.height - platformHeight - 1, metaTS.firstgid + TL.meta.solid)
            
            gPlatform.origin.x = platformIndex;
            gPlatform.origin.y = this.level.height - platformHeight - 1;
            cPlatform.origin.x = platformIndex;
            cPlatform.origin.y = this.level.height - platformHeight - 1;

            platformIndex += platformLength;

            applyPatch(gPlatform, this.level, this.foreground);
            applyPatch(cPlatform, this.level, this.collision);

            // build an air space

            airLength = getRandom(airMin, airMax);
            platformIndex += airLength;
            // Build a Platform
            // Build Spacing
            // Edge check
            // Add
        }


        /*
        //Generate foreground
        var minHeight 1;
        var height = 6;
        var maxHeight = 8;
        var maxDifference = 2;
        
        var heightController = new randomIntervalGenerator().init(2, 8
            function() {
                // Generate the new height
                height = getRandom(height - maxDifference, height + maxDifference + 1);
                if(height > maxHeight) height = maxHeight;
                if(height < minHeight) height = minHeight;
            })

        for(var i = 0; i < level.width; i++)
        {
            // lets build some VARIANCE
            heightControler.tick();

            // This is where the height gets translated.
            var spacing = [level.height - height,1,height-1];
            var gData = [null, forestTS.firstgid, + TL.forest.ground.top, forestTS.firstgid + TL.forest.ground.mid]
            var cData = [null, metaTS.firstgie + TL.meta.solid, metaTS.firstgid + TL.meta.solid];
            var graphicColumn = this.generatePatchColumn(level.height, spacing, gData);
            var collisionColumn = this.generatePatchColumn(level.height, spacing, cData);

            graphicColumn.origin.x = i;
            graphicColumn.origin.y = 0;
            collisionColumn.origin.x = i;
            collisionColumn.origin.y = 0;

            applyPatch(graphicColumn, this.foreground);
            applyPatch(collisionColumn, this.collision);
        }*/


        // Build backgrounds

        // for now we're just going to build a giant patch to slap on the back
        var lightBGID = forestTS.firstgid + TL.forest.darkBG;
        var mountainTop = forestTS.firstgid + 10;
        var mountainMid = forestTS.firstgid + 28;
        var backgroundTilePatch = new TilePatch().init(0,3, this.level.width, this.level.height, mountainTop);
        var backgroundTilePatch2 = new TilePatch().init(0,4, this.level.width, 1, mountainMid);
        var backgroundTilePatch3 = new TilePatch().init(0,5, this.level.width, this.level.height - 5, lightBGID);
        applyPatch(backgroundTilePatch, this.level, this.background3);
        applyPatch(backgroundTilePatch2, this.level, this.background3);
        applyPatch(backgroundTilePatch3, this.level, this.background3);

        // Build Trees
        // Find out where we need to start in the foreground, then build up a tree from there

        // FRONT TREES
        var treeColumnIndex = 0;
        var treeBot = forestTS.firstgid + TL.forest.tree1.bottom;
        var treeMid = forestTS.firstgid + TL.forest.tree1.middle[0];
        var treeMid2 = forestTS.firstgid + TL.forest.tree1.middle[1];

        var tree2Bot = forestTS.firstgid + TL.forest.tree2.bottom;
        var tree2Mid = forestTS.firstgid + TL.forest.tree2.middle[0];
        var tree2Mid2 = forestTS.firstgid + TL.forest.tree2.middle[1];
        

        var knothole = forestTS.firstgid + TL.forest.tree1.knothole;

        treeColumnIndex += getRandom(0,4);
        console.log("tree col idx: " + treeColumnIndex + ", level wd: " + this.level.width);
        while(treeColumnIndex < this.level.width)
        {
            // find bottom
            var heightIndex = GetTopHeightIndex(this.level, this.foreground, treeColumnIndex);
            console.log("ht index: " + heightIndex + ", level height: " + (this.level.height -1));
            if(heightIndex < this.level.height - 1)
            {
                // We've found a platform
                //Tree 1
                if(randomPick([true,false]))
                {
                    var treePatch = new TilePatch().init(treeColumnIndex, 0, 1, heightIndex, randomPick([treeMid, treeMid2]));
                    treePatch.tiles[0][treePatch.tilesHigh - 1].tileId = treeBot;

                    // Put in a knothole
                    if(getRandom(0,5) == 0)
                    {
                        var knotholeIndex = getRandom(0, treePatch.tilesHigh - 1);
                        treePatch.tiles[0][knotholeIndex].tileId = knothole;
                    }
                }
                else // Tree 2
                {
                    var treePatch = new TilePatch().init(treeColumnIndex, 0, 1, heightIndex ,randomPick([tree2Mid, tree2Mid2]));
                    treePatch.tiles[0][treePatch.tilesHigh -1].tileId = tree2Bot;
                }

                applyPatch(treePatch, this.level, this.background1);
            }
            treeColumnIndex += getRandom(1,12);
            console.log("tree col idx: " + treeColumnIndex + ", level wd: " + this.level.width);
        }

        // background trees
        var tree2Index = 0;
        var backTreeId = forestTS.firstgid + TL.forest.backgroundTrees1[0];
        var backTreeId2 = forestTS.firstgid + TL.forest.backgroundTrees1[1];
        tree2Index += getRandom(0,4);
        while(tree2Index < this.level.width){
            // find bottom
            var backTreePatch = new TilePatch().init(tree2Index, 0, 1, this.level.width-1, backTreeId);
            tree2Index+= getRandom(1,6);
            applyPatch(backTreePatch, this.level, this.background2);
        }

    };
};
