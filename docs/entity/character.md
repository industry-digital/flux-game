# Character

```json
{
  "id": "58u0jfmiwqj490tx",
  "type": "character",
  "name": "David Martinez",
  "description": {
    "base": "A lean-muscled edgerunner with sandy blond hair styled in a disheveled undercut. Military-grade cyberware lines his arms and neck, visible beneath his reinforced red-and-white jacket bearing the Samurai logo. A distinctive barcode tattoo marks the side of his neck, and his eyes glow a faint blue when his neural implants activate.",
    "emergent": "David moves with the jerky precision of someone who's spent more time in cyberspace than meatspace. His reflexes are unnaturally quick—courtesy of that top-shelf Sandevistan you can glimpse glinting at the base of his skull. The metal implants along his arms catch the neon light of Arasaka Plaza, turning his skin into a canvas of crimson and blue. There's a hollowness to his gaze, like he's seen Night City devour too many souls, yet a reckless fire still burns there, threatening to consume what's left of his humanity. When he speaks, his voice carries the synthetic edge of someone who's had their vocal cords replaced one too many times, metallic and raw. The weight of his weapons doesn't slow him—if anything, they seem to complete him, like missing limbs finally returned."
  },
  "placeId": "nightcity:arasaka-hq:plaza",
  "accountId": "550e8400-e29b-41d4-a716-446655440000",
  "condition": "alive",
  "attributes": {
    "level": 15,
    "hp": {
      "natural": {
        "current": 85,
        "max": 100
      }
    },
    "injuries": {
      "flux:anatomy:human:left:arm:hand": {
        "integrity": 0.65,
        "effects": {
          "flux:effect:injury:laceration": {
            "type": "flux:effect:injury:laceration",
            "source": "item:weapon:blade:monofilament",
            "ts": 1746230080551,
            "duration": "2h"
          }
        }
      },
      "flux:anatomy:human:right:leg:knee": {
        "integrity": 0.45,
        "effects": {
          "flux:effect:injury:fractured": {
            "type": "flux:effect:injury:fractured",
            "source": "flux:damage:type:blunt",
            "ts": 1746229950551,
            "duration": "7day"
          }
        }
      }
    },
    "mass": {
      "natural": 75000
    },
    "stats": {
      "str": { "natural": 15 },
      "con": { "natural": 14 },
      "agi": { "natural": 22 },
      "dex": { "natural": 18 },
      "spd": { "natural": 16 },
      "int": { "natural": 8 },
      "wis": { "natural": 9 },
      "cha": { "natural": 13 }
    },
    "equipment": {
      "flux:anatomy:head": {
        "item:implant:sandevistan:r928": 1,
        "item:clothing:hat:netrunner-beanie:p492": 1
      },
      "flux:anatomy:torso": {
        "item:clothing:jacket:samurai-chrome-trim:s445": 1,
        "item:clothing:shirt:militech-subdermal-kevlar:t123": 1
      },
      "flux:anatomy:legs": {
        "item:clothing:pants:arasaka-urban-combat:u979": 1
      },
      "flux:anatomy:feet": {
        "item:clothing:boots:militech-grip-tech:v056": 1
      },
      "flux:anatomy:back": {
        "item:container:rucksack:large:e050": 1
      },
      "flux:anatomy:left:arm:wrist": {
        "item:accessory:watch:militech-tactical-timekeeper:w034": 1
      },
      "flux:anatomy:right:arm:hand": {
        "item:weapon:gun:pistol:militech-m76e:x012": 1
      }
    },
    "traits": {
      "flux:trait:obsessive:implants": 1
    },
    "skills": {
      "flux:skill:weapon:heavy": {
        "xp": 5322,
        "pxp": 215,
        "conc": {
          "natural": {
            "current": 52,
            "max": 100
          },
          "effective": {
            "current": 52,
            "max": 140
          },
          "modifiers": {
            "dex-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:dex",
              "value": 40,
              "ts": 1746230100551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746230100551
      },
      "flux:skill:defense:armor:powered": {
        "xp": 2582,
        "pxp": 157,
        "conc": {
          "natural": {
            "current": 61,
            "max": 100
          },
          "effective": {
            "current": 61,
            "max": 120
          },
          "modifiers": {
            "con-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:con",
              "value": 20,
              "ts": 1746229800551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746229800551
      },
      "flux:skill:weapon:gun": {
        "xp": 1234,
        "pxp": 305,
        "conc": {
          "natural": {
            "current": 46,
            "max": 100
          },
          "effective": {
            "current": 46,
            "max": 140
          },
          "modifiers": {
            "dex-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:dex",
              "value": 40,
              "ts": 1746229700551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746229700551
      },
      "flux:skill:weapon:melee": {
        "xp": 4321,
        "pxp": 118,
        "conc": {
          "natural": {
            "current": 79,
            "max": 100
          },
          "effective": {
            "current": 79,
            "max": 140
          },
          "modifiers": {
            "dex-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:dex",
              "value": 40,
              "ts": 1746229600551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746229600551
      },
      "flux:skill:implants:time-dilation": {
        "xp": 1234,
        "pxp": 457,
        "conc": {
          "natural": {
            "current": 46,
            "max": 100
          },
          "effective": {
            "current": 46,
            "max": 100
          },
          "modifiers": {
            "int-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:int",
              "value": 0,
              "ts": 1746230150551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746230150551
      },
      "flux:skill:pilot:automobile": {
        "xp": 5678,
        "pxp": 89,
        "conc": {
          "natural": {
            "current": 23,
            "max": 100
          },
          "effective": {
            "current": 23,
            "max": 140
          },
          "modifiers": {
            "dex-affinity-bonus": {
              "type": "flux:modifier:stat:affinity",
              "source": "flux:stat:dex",
              "value": 40,
              "ts": 1746229500551,
              "duration": "permanent"
            }
          }
        },
        "ts": 1746229500551
      }
    },
    "inventory": {
      "item:clothing:jacket:samurai-chrome-trim:s445": {
        "condition": 0.95
      },
      "item:clothing:shirt:militech-subdermal-kevlar:t123": {
        "condition": 0.88
      },
      "item:clothing:pants:arasaka-urban-combat:u979": {
        "condition": 0.92
      },
      "item:clothing:boots:militech-grip-tech:v056": {
        "condition": 0.76
      },
      "item:clothing:hat:netrunner-beanie:p492": {
        "condition": 0.97
      },
      "item:accessory:watch:militech-tactical-timekeeper:w034": {
        "condition": 0.99
      },
      "item:implant:sandevistan:r928": {
        "condition": 0.90
      },
      "item:weapon:gun:pistol:militech-m76e:x012": {
        "condition": 0.85
      },
      "item:container:rucksack:large:e050": {
        "condition": 0.78,
        "contents": [
          "item:weapon:gun:rifle:famas:y789",
          "item:weapon:gun:pistol:desert-eagle:z078",
          "item:consumable:inhaler:maxtac-stim:a067"
        ]
      },
      "item:weapon:gun:rifle:famas:y789": {
        "condition": 0.82
      },
      "item:weapon:gun:pistol:desert-eagle:z078": {
        "condition": 0.94
      },
      "item:consumable:inhaler:maxtac-stim:a067": {
        "condition": 1.0,
        "charges": { "current": 3, "max": 5 }
      },
      "item:ammo:gun:pistol:9mm:b342": {
        "condition": 1.0,
        "stack": { "current": 48, "max": 50 }
      }
    },
    "memberships": {},
    "subscriptions": {},
    "origin": "Born in Santo Domingo to a struggling single mother, David's life changed when he won a scholarship to the prestigious Arasaka Academy. His mother's death during a cyberpsycho incident led him to drop out and turn to the edge, using her insurance money to install military-grade cyberware. Now he runs with a crew of edgerunners, taking increasingly dangerous jobs as the toll of his implants pushes him toward the edge of cyberpsychosis.",
    "effects": {
      "flux:effect:hFOXa6PtbzBzMtPdoxuP0WNSeD9wSkHw": {
        "type": "flux:effect:time:dilation",
        "source": "item:implant:sandevistan:r928",
        "ts": 1746230150551,
        "duration": "60s",
        "magnitude": 0.5
      }
    },
    "abilities": {
      "flux:ability:weapon:heavy:suppression-field": {
        "ts": 1746230050551,
        "cooldown": {
          "natural": 30000,
          "effective": 27000,
          "ts": 1746230050551,
          "modifiers": {
            "cybernetic-reflexes": {
              "type": "flux:modifier:cooldown:reduction",
              "source": "item:implant:sandevistan:r928",
              "value": -3000,
              "ts": 1746230050551,
              "duration": "permanent"
            }
          }
        },
        "modifiers": {
          "heavy-mastery": {
            "type": "flux:modifier:ability:amplify",
            "source": "flux:skill:weapon:heavy",
            "value": 15,
            "ts": 1746230050551,
            "duration": "permanent"
          }
        }
      },

      "flux:ability:pilot:automobile:combat-drift": {
        "ts": 1746229950551,
        "cooldown": {
          "natural": 60000,
          "effective": 60000,
          "ts": 1746229950551
        },
        "modifiers": {
          "piloting-mastery": {
            "type": "flux:modifier:ability:amplify",
            "source": "flux:skill:pilot:automobile",
            "value": 20,
            "ts": 1746229950551,
            "duration": "permanent"
          },
          "dexterity-bonus": {
            "type": "flux:modifier:ability:duration",
            "source": "flux:stat:dex",
            "value": 2,
            "ts": 1746229950551,
            "duration": "permanent"
          }
        }
      },

      "flux:ability:implants:time-dilation:chrono-reflex": {
        "ts": 1746229850551,
        "cooldown": {
          "natural": 300000,
          "effective": 270000,
          "ts": 1746229850551,
          "modifiers": {
            "cybernetic-integration": {
              "type": "flux:modifier:cooldown:reduction",
              "source": "item:implant:sandevistan:r928",
              "value": -0.1,
              "ts": 1746229850551,
              "duration": "permanent"
            }
          }
        },
        "modifiers": {
          "sandevistan-amplification": {
            "type": "flux:modifier:ability:amplify",
            "source": "item:implant:sandevistan:r928",
            "value": 25,
            "ts": 1746229850551,
            "duration": "permanent"
          }
        },
      },

      "flux:ability:weapon:melee:monofilament-lash": {
        "ts": 1746229800551,
        "cooldown": {
          "natural": 15000,
          "effective": 15000,
          "ts": 1746229800551
        },
        "modifiers": {
          "melee-mastery": {
            "type": "flux:modifier:ability:damage",
            "source": "flux:skill:weapon:melee",
            "value": 30,
            "ts": 1746229800551,
            "duration": "permanent"
          },
          "agility-bonus": {
            "type": "flux:modifier:ability:accuracy",
            "source": "flux:stat:agi",
            "value": 15,
            "ts": 1746229800551,
            "duration": "permanent"
          }
        }
      }
    }
  },
  "createdAt": 1746220150551,
  "updatedAt": 1746230150551,
  "version": 42
}
```
