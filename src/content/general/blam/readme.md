---
title: Blam! engine
keywords:
  - blam
  - build
  - debug
  - release
  - assert
  - assertion
  - play
  - cache
  - tags
  - test
  - profile
  - beta
  - ship
---
The **Halo Engine**, also called **Blam!**, is Bungie's in-house proprietary engine used in all of the Halo games. Each generation added new capabilities and had systems overhauled, but one of its defining characteristics is the [tags system](~tags) used for managing resources. It is written in a combination of C and C++ (about 1.5M LoC for Halo 2).

There are two main groups of engine generations where the asset pipelines and features tend to be more similar to each other:

* Halo 1, Halo 2, and Halo 3/ODST;
* Halo Reach, Halo 2 Anniversary MP, and Halo 4.

# Build types
Halo's developers can create builds of the tools and games with with different features and checks enabled or disabled. This isn't something that can be done by the end user but it's worth knowing what features are enabled or disabled on the build you are using.

Firstly, the engine can load [tags](~) in one of two ways:

* **Tag:** Resources are loaded from individual files stored on disk that can be edited using the mod tools. The data is validated on load and an error is shown on failure.
* **Cache:** Resources are loaded from cache files (also called "maps" because of their extension), these can't be easily edited and only go through minimal validation.

Additionally, multiple levels of optimization are available depending on what features are needed. In decreasing order of optimization:

1. **release**: Used for the MCC itself and has minimal checks, no error logging and maximum optimizations. Invalid data will either be ignored or crash the engine.
2. **profile**: More or less the same as `release` but with some extra debug code.
3. **play**: Includes error logging and most [assertions](#how-to-read-exception-messages). Optimizations are still enabled for this build type. Invalid data will usually result in an error or a fatal error. It is not recommended to use _sapien_play_ builds for editing scenarios with AI (non-MP), as it excludes some AI tools and editor functionality.
4. **test**: Includes more error checking and has optimizations disabled. AI debugging code is included at this level in H1A (used to only be included in debug builds).
5. **debug**: Includes full error checking and isn't optimized, this is used internally for development.

Legacy Halo 1 used different levels but the same general concepts apply.

The naming convention for builds is `<cache/tag>_<build_configuration>`, for example `halo_tag_test.exe`.


# Architecture
Halo's engine was built to support the kind of features needed for its singleplayer and multiplayer sandbox shooter gameplay. There are only certain types of objects and effects that can exist in the world which are inherent to the engine, and it's not possible to create new ones or extend the game's systems.

However, you can create anything within the possibilities of custom [_tags_](~), which allow for a surprising amount of variety. Tags are the game's resource system and contain the properties for each unique type of object, asset, effect, and more. When a level is loaded, all of its tags are loaded into memory.

The properties of the game world and its objects are stored in the _game state_. This is a collection of data that contains everything needed to represent the world at a given time, such as the position of objects, health of bipeds, and the execution state of script threads. It's what gets saved and loaded at checkpoints.

The game state is updated in fixed time steps called _ticks_. This process is deterministic, meaning given any initial game state, advancing it by some number of ticks and replaying player inputs will always produce the same result in the world simulation, important for co-op (synchronous) networking and theater mode. The changes made during ticks are called _updates_ and include physics simulation, handling player input, driving effects, and more. The data in your tags will affect how these updates happen.

Finally, the audio and visuals of the game are rendered based on tag assets too.

The Halo resource system is [quite flexible](http://nikon.bungie.org/misc/gdc2005_mnoguchi/) as it's capable of introspection and abstracted away from the code that uses the data, allowing for the dynamically generated UIs used in [Guerilla](~h1-guerilla). Tools like Sapien are built on the same code the game uses, allowing for player simulation and AI to act out encounters.

# How to read exception messages
Halo's tools and runtime code is littered with checks called [_assertions_](https://en.wikipedia.org/wiki/Assertion_(software_development)) which are included in play, test, and debug [build types](#build-types). They verify certain expected conditions are true during execution, and otherwise immediately stop the game or tool with an `EXCEPTION halt` message logged to `reports/debug.txt`. During Halo's development the game would be tested with these checks enabled to ensure various assumptions are being met, and then disabled on release to avoid their performance impact or potential to cause a crash.

As a modder, you will almost certainly run into these error messages at some point, but they were originally intended for Halo's developers and can be very user-unfriendly. This site documents many common assertion causes but learning to interpret their messages can potentially save you a lot of time. Assertions are usually caused by improper tags or source data but it's often not possible to narrow down the exact root cause from the message alone and you may need to follow up with some [further troubleshooting](~help#troubleshooting-issues).

Let's decompose some examples from H1. Suppose Sapien just crashed opening a new level and you see this in `debug.txt`:

```
EXCEPTION halt in \halopc\haloce\source\tag_files\tag_groups.c,#3157: #0 is not a valid shader_transparent_chicago_map_block index in [#0,#0)
```

1. `EXCEPTION halt`: States that the game or tool detected an unexpected situation and stopped.
2. `in \halopc\...\tag_groups.c`: Indicates the name of the game's source code file which encountered the exception/assertion. Although we do not have access to the game's source code, this file name can be an important clue to the root cause. In this case `tag_groups.c` is likely responsible for basic [tag group](~tags#tag-groups) operations like [resolving references](~tags#tag-paths-and-references) or accessing [block elements](~tags#blocks-and-elements). Note that the start of the file path will differ between [Custom Edition](~custom-edition) (`\halopc\...`) and MCC-era tools (`e:\jenkins\...`).
3. `#3157`: Indicates the line number in the above source code file. Without the game's source code this is mostly useless to us. However, you could infer that exceptions within a hundred lines of each other **may** be related in purpose. Line numbers are also subject to change between CE and MCC-era tools.
4. `#0 is not a valid shader_transparent_chicago_map_block index in [#0,#0)`: This is the exception message itself (everything following the colon) which provides additional detail. In this case, we see some common sub-patterns. The #-prefixed number `#0` is an [index](~tags#blocks-and-elements), and `[#0,#0)` represents a valid [range/interval](https://en.wikipedia.org/wiki/Interval_(mathematics)) for that index. This range is actually empty since its exclusive end index/length is `#0)`, so together with the rest of the message we can guess we are trying to access the first element of an empty block in a [shader_transparent_chicago](~) tag. Specifically it mentions a _map_ block so the shader tag doesn't contain any textures/maps, but we don't know _which_ shader so you would need to look through all recent additions to the level.

Let's take a look at another case:

```
EXCEPTION halt in e:\jenkins\workspace\mcch1code-release\mcc\release\h1\code\h1a2\sources\ai\actor_firing_position.c,#1431: (test_surface_index >= 0) && (test_surface_index < collision_bsp->surfaces.count)
```

We can see the exception is somehow related to AI firing positions, but the message details are cryptic this time. What you're seeing is an _assertion failure_: a certain `true`/`false` condition needed to be `true` at this point in execution, but wasn't. The text `(test_surface_index >= 0) && (test_surface_index < collision_bsp->surfaces.count)` is the condition written as a [boolean expression](https://en.wikipedia.org/wiki/Boolean_expression) in the game's code. It's saying a `test_surface_index` needed to be at least 0 AND less than the number of surfaces in the collision BSP.

Knowing what this means takes a bit of familiarity with the engine. A "test surface" in the engine's terms means a surface found by a ray test (e.g. shooting a ray in some direction to find what surface it hit). From context we know that firing positions are placed within the [BSP](~h1/tags/scenario_structure_bsp), so it's likely the game is trying to discover what BSP surface is beneath one but the index of the surface is invalid. Halo often represents "none" values as `-1`, so we can guess no surface was discovered since `-1` is less than `0` and caused the assertion failure. This could happen if the firing position is _outside the BSP_, which you could correct in Sapien.

# More information
For details on each generation see pages dedicated to them:
- [H1 Engine](~h1/engine)
- [H2 Engine](~h2/engine)
- [H3 Engine](~h3/engine)

# History
The engine's history began in Bungie's [_Pathways into Darkness_][pid], according to developer Chris Butcher:

> The \[Halo\] engine is a direct-line descendant of the 1992 Pathways into Darkness engine originally written by Bungie for 68000 Macs using MPW and C. Not much remains except math functions and overall architecture, but the engine definitely has old roots. The path of descent runs through PiD to Marathon to Myth to Halo. In recent years it has shifted away from being primarily a player-driven renderer to being primarily a world simulation.

Something closer to Halo would later evolve from [_Myth_][myth]. In a [Jason Jones interview][jones-interview], he says:

> Halo didn't begin as a strategy game but the engine it uses started out that way. The engine Halo uses began as a next-generation Myth terrain engine, with polygonal units.

[jones-interview]: https://web.archive.org/web/20000815110240/http://www.insidemacgames.com/features/99/jones/jones.shtml
[myth]: https://en.wikipedia.org/wiki/Myth_(series)
[pid]: https://en.wikipedia.org/wiki/Pathways_into_Darkness