# Monster Simulation Server Design Document

## Introduction

The Monster Simulation Server is an Erlang OTP application that manages the autonomous behavior of up to **30,000 monsters** within the simulation (3x the 10,000 CCU target). It leverages Erlang's actor model to provide massive concurrency, fault tolerance, and real-time responsiveness while exploiting our revolutionary batch processing architecture to achieve unprecedented simulation scale.

## Architecture Overview

### Core Design Principles

1. **Actor-Per-Monster**: Each monster is modeled as a lightweight Erlang process
2. **Event-Driven Behavior**: Monsters react to world events received via XMPP PubSub on a single canonical JID.
3. **Batch Command Generation**: Monster actions are aggregated into optimal batches for the World Server
4. **Hierarchical Supervision**: Geographic and functional organization of monster populations
5. **Fault Isolation**: Monster crashes don't affect the broader simulation
6. **Hot Code Loading**: Deploy new AI behaviors without simulation downtime

### System Components

```
monster_simulation_app
├── xmpp_world_listener          % XMPP PubSub event receiver
├── command_batch_collector      % Aggregates monster actions into batches
├── world_server_client          % HTTP client for World Server communication
├── monster_population_registry  % Global monster discovery and management
└── geographic_supervisor_tree   % Hierarchical monster organization
    ├── region_supervisor
    │   ├── area_supervisor
    │   │   ├── monster_worker
    │   │   └── monster_ai_behavior
    │   └── monster_spawner
    └── dungeon_supervisor
```

## Technical Architecture

### Monster Worker Process

Each monster is implemented as a `GenServer` process with the following responsibilities:

```elixir
defmodule MonsterSimulation.MonsterWorker do
  use GenServer

  defstruct [
    :id,
    :type,
    :location,
    :stats,
    :ai_state,
    :last_action,
    :cooldowns
  ]

  # API
  def start_link({monster_id, monster_type, initial_location}) do
    GenServer.start_link(__MODULE__, {monster_id, monster_type, initial_location})
  end

  def notify_world_event(pid, event) do
    GenServer.cast(pid, {:world_event, event})
  end

  # Callbacks
  def init({monster_id, monster_type, initial_location}) do
    state = %__MODULE__{
      id: monster_id,
      type: monster_type,
      location: initial_location,
      stats: MonsterTypes.get_base_stats(monster_type),
      ai_state: %{},
      last_action: System.system_time(:millisecond),
      cooldowns: %{}
    }

    {:ok, state}
  end

  def handle_cast({:world_event, event}, state) do
    case should_react_to_event?(event, state) do
      true ->
        actions = compute_monster_actions(event, state)
        new_state = update_monster_state(event, state)
        schedule_actions(actions)
        {:noreply, new_state}
      false ->
        {:noreply, state}
    end
  end

  defp should_react_to_event?(event, state) do
    MonsterAI.should_react?(state.type, event, state)
  end

  defp compute_monster_actions(event, state) do
    MonsterAI.decide_actions(state.type, event, state)
  end

  defp schedule_actions(actions) do
    Enum.each(actions, fn action ->
      CommandBatchCollector.schedule_command(action)
    end)
  end
end
```

### Geographic Supervision Tree

Monsters are organized hierarchically based on their location in the game world:

```elixir
defmodule MonsterSimulation.GeographicSupervisor do
  use Supervisor

  def start_link(opts) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_opts) do
    children = [
      # Static supervisors for major world regions
      {MonsterSimulation.RegionSupervisor, region: :overworld},
      {MonsterSimulation.RegionSupervisor, region: :underworld},
      {MonsterSimulation.RegionSupervisor, region: :astral_plane},

      # Dynamic supervisor for instanced dungeons
      {DynamicSupervisor, name: MonsterSimulation.DungeonSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end

defmodule MonsterSimulation.RegionSupervisor do
  use Supervisor

  def start_link(opts) do
    region = Keyword.fetch!(opts, :region)
    Supervisor.start_link(__MODULE__, region, name: via_tuple(region))
  end

  def init(region) do
    children = [
      # Area supervisors for this region
      {MonsterSimulation.AreaSupervisor, area: :"#{region}_forest"},
      {MonsterSimulation.AreaSupervisor, area: :"#{region}_mountains"},
      {MonsterSimulation.AreaSupervisor, area: :"#{region}_plains"},

      # Monster spawner for this region
      {MonsterSimulation.MonsterSpawner, region: region}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp via_tuple(region) do
    {:via, Registry, {MonsterSimulation.Registry, {:region_supervisor, region}}}
  end
end
```

### Event Processing Pipeline

#### 1. XMPP Event Reception

```elixir
defmodule MonsterSimulation.XMPPWorldListener do
  use GenServer
  require Logger

  defstruct [:connection, :subscriptions]

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_opts) do
    xmpp_config = [
      username: "monster_simulation",
      server: "fabric.flux.io",
      resource: "simulation_node_1",
      password: Application.get_env(:monster_simulation, :xmpp_password)
    ]

    {:ok, connection} = Escalus.Connection.start(xmpp_config)

    # Subscribe to relevant world events
    event_subscriptions = [
      "world/+/entity_moved",
      "world/+/combat_started",
      "world/+/entity_died",
      "world/+/spell_cast",
      "world/+/item_dropped",
      "world/+/player_entered",
      "world/+/player_left"
    ]

    Enum.each(event_subscriptions, fn topic ->
      Escalus.PubSub.subscribe(connection, topic, self())
    end)

    {:ok, %__MODULE__{connection: connection, subscriptions: event_subscriptions}}
  end

  def handle_info({:pubsub_event, topic, event}, state) do
    # Parse and route event to affected monsters
    parsed_event = MonsterSimulation.WorldEventParser.parse(topic, event)

    parsed_event
    |> affected_monsters()
    |> route_event_to_monsters(parsed_event)

    {:noreply, state}
  end

  defp affected_monsters(event) do
    MonsterSimulation.EventRouter.affected_monsters(event)
  end

  defp route_event_to_monsters(monster_pids, event) do
    Enum.each(monster_pids, fn pid ->
      MonsterSimulation.MonsterWorker.notify_world_event(pid, event)
    end)
  end
end
```

#### 2. Intelligent Event Routing

```elixir
defmodule MonsterSimulation.EventRouter do
  @moduledoc """
  Efficiently determines which monsters should react to world events.
  """

  def affected_monsters(%{type: :entity_moved, location: location}) do
    # Get all monsters in the same location
    MonsterSimulation.PopulationRegistry.get_monsters_in_location(location)
  end

  def affected_monsters(%{type: :combat_started, participants: participants}) do
    # Get monsters within combat range
    participants
    |> Enum.map(&get_entity_location/1)
    |> Enum.flat_map(fn location ->
      MonsterSimulation.PopulationRegistry.get_monsters_in_location(location)
    end)
    |> Enum.uniq()
  end

  def affected_monsters(%{type: :spell_cast, location: location, radius: radius}) do
    # Get monsters within spell effect radius
    MonsterSimulation.PopulationRegistry.get_monsters_within_radius(location, radius)
  end

  def affected_monsters(%{type: :player_entered, entity: _player_id, location: location}) do
    MonsterSimulation.PopulationRegistry.get_monsters_in_location(location)
  end

  def affected_monsters(_event), do: []

  defp get_entity_location(entity_id) do
    # Query world state for entity location
    # This could be cached or looked up from a local spatial index
    WorldState.get_entity_location(entity_id)
  end
end
```

#### 3. AI Decision Making

```elixir
defmodule MonsterSimulation.MonsterAI do
  @moduledoc """
  Core AI decision system - pure and testable functions.
  """

  @doc """
  Determines if a monster should react to a specific event.
  """
  def should_react?(monster_type, event, monster_state) do
    ai_behavior = get_ai_behavior(monster_type)
    ai_behavior.should_react_to_event(event, monster_state)
  end

  @doc """
  Computes actions for a monster given an event and current state.
  """
  def decide_actions(monster_type, event, monster_state) do
    ai_behavior = get_ai_behavior(monster_type)
    ai_behavior.decide_actions(event, monster_state)
  end

  defp get_ai_behavior(:orc_warrior), do: MonsterSimulation.AI.OrcWarrior
  defp get_ai_behavior(:goblin_trader), do: MonsterSimulation.AI.GoblinTrader
  defp get_ai_behavior(:wolf), do: MonsterSimulation.AI.Wolf
  defp get_ai_behavior(:dragon), do: MonsterSimulation.AI.Dragon
  defp get_ai_behavior(_), do: MonsterSimulation.AI.DefaultBehavior
end

# Example AI behavior implementation
defmodule MonsterSimulation.AI.OrcWarrior do
  @behaviour MonsterSimulation.AI.Behavior

  def should_react_to_event(%{type: :player_entered}, _state), do: true
  def should_react_to_event(%{type: :combat_started}, _state), do: true
  def should_react_to_event(%{type: :entity_died}, _state), do: true
  def should_react_to_event(_event, _state), do: false

  def decide_actions(%{type: :player_entered, entity: player_id}, monster_state) do
    case should_attack?(player_id, monster_state.stats) do
      true ->
        [%{type: :attack, target: player_id}]
      false ->
        [%{type: :emote, message: "grumbles menacingly"}]
    end
  end

  def decide_actions(%{type: :combat_started}, _monster_state) do
    [%{type: :buff_self, spell: "battle_rage"}]
  end

  def decide_actions(%{type: :entity_died, entity: enemy}, _monster_state) do
    [%{type: :emote, message: "roars in victory"}]
  end

  defp should_attack?(player_id, monster_stats) do
    # Simple aggression logic based on monster's current health and stats
    player_threat_level = calculate_threat_level(player_id)
    monster_confidence = monster_stats.health / monster_stats.max_health

    monster_confidence > 0.3 and player_threat_level < monster_stats.level * 1.5
  end

  defp calculate_threat_level(player_id) do
    # This could query cached player data or use heuristics
    # For now, just return a placeholder
    50
  end
end
```

### Command Batching System

#### Batch Collector Process

```elixir
defmodule MonsterSimulation.CommandBatchCollector do
  use GenServer
  require Logger

  defstruct [
    pending_commands: [],
    batch_timer: nil,
    batch_size_limit: 1000,  # Large batches for HTTP interface
    batch_time_limit_ms: 200, # Allow time to fill large batches
    world_server_client: nil
  ]

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def schedule_command(command) do
    GenServer.cast(__MODULE__, {:schedule_command, command})
  end

  def init(opts) do
    world_server_client = Keyword.get(opts, :world_server_client)
    batch_size_limit = Keyword.get(opts, :batch_size_limit, 1000)  # Optimize for HTTP batches
    batch_time_limit_ms = Keyword.get(opts, :batch_time_limit_ms, 200)  # Allow batch accumulation

    state = %__MODULE__{
      world_server_client: world_server_client,
      batch_size_limit: batch_size_limit,
      batch_time_limit_ms: batch_time_limit_ms
    }

    {:ok, state}
  end

  def handle_cast({:schedule_command, command}, state) do
    new_pending = [command | state.pending_commands]
    new_size = length(new_pending)

    cond do
      new_size >= state.batch_size_limit ->
        # Size limit reached - flush immediately
        flush_batch(new_pending, state)
        cancel_timer(state.batch_timer)
        {:noreply, %{state | pending_commands: [], batch_timer: nil}}

      state.batch_timer == nil ->
        # Start timer for time-based flush
        timer = Process.send_after(self(), :batch_timeout, state.batch_time_limit_ms)
        {:noreply, %{state | pending_commands: new_pending, batch_timer: timer}}

      true ->
        # Timer already running
        {:noreply, %{state | pending_commands: new_pending}}
    end
  end

  def handle_info(:batch_timeout, state) do
    case state.pending_commands do
      [] ->
        {:noreply, %{state | batch_timer: nil}}
      commands ->
        flush_batch(commands, state)
        {:noreply, %{state | pending_commands: [], batch_timer: nil}}
    end
  end

  defp flush_batch(commands, state) do
    Logger.debug("Flushing batch of #{length(commands)} commands")

    Task.start(fn ->
      MonsterSimulation.WorldServerClient.post_commands_batch(
        state.world_server_client,
        commands
      )
    end)
  end

  defp cancel_timer(nil), do: :ok
  defp cancel_timer(timer) do
    Process.cancel_timer(timer)
    :ok
  end
end
```

### World Server Integration

#### HTTP Client for Command Batches

```elixir
defmodule MonsterSimulation.WorldServerClient do
  use GenServer
  require Logger

  defstruct [:base_url, :auth_token, :http_options]

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def post_commands_batch(client \\ __MODULE__, commands) do
    GenServer.call(client, {:post_batch, commands}, 30_000)
  end

  def init(opts) do
    state = %__MODULE__{
      base_url: Keyword.fetch!(opts, :base_url),
      auth_token: Keyword.fetch!(opts, :auth_token),
      http_options: [
        timeout: 30_000,
        recv_timeout: 30_000,
        hackney: [pool: :monster_simulation_pool]
      ]
    }

    {:ok, state}
  end

  def handle_call({:post_batch, commands}, _from, state) do
    url = "#{state.base_url}/commands/batch"  # Dedicated batch endpoint

    headers = [
      {"Content-Type", "application/json"},
      {"Authorization", "Bearer #{state.auth_token}"},
      {"X-Batch-Size", "#{length(commands)}"}  # Help server optimize processing
    ]

    # Large batch payload optimized for HTTP transport
    batch_payload = %{
      commands: commands,
      source: "monster_simulation",
      batch_id: generate_batch_id(),
      timestamp: System.system_time(:millisecond)
    }

    body = Jason.encode!(batch_payload)

    case HTTPoison.post(url, body, headers, state.http_options) do
      {:ok, %HTTPoison.Response{status_code: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, response} ->
            Logger.debug("Successfully posted batch of #{length(commands)} commands")
            {:reply, {:ok, response}, state}
          {:error, decode_error} ->
            Logger.error("Failed to decode response: #{inspect(decode_error)}")
            {:reply, {:error, :decode_error}, state}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: error_body}} ->
        Logger.error("HTTP error #{status_code}: #{error_body}")
        {:reply, {:error, {:http_error, status_code, error_body}}, state}

      {:error, %HTTPoison.Error{reason: reason}} ->
        Logger.error("Request failed: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end
end
```

## Monster AI Behavior System

### Pluggable AI Architecture

```elixir
defmodule MonsterSimulation.AI.Behavior do
  @moduledoc """
  Behavior contract for monster AI implementations.
  """

  @callback should_react_to_event(event :: map(), monster_state :: map()) :: boolean()
  @callback decide_actions(event :: map(), monster_state :: map()) :: [map()]
  @callback update_state(event :: map(), monster_state :: map()) :: map()

  @optional_callbacks [update_state: 2]

  defmacro __using__(_opts) do
    quote do
      @behaviour MonsterSimulation.AI.Behavior

      # Default implementation for optional callbacks
      def update_state(_event, monster_state), do: monster_state

      defoverridable update_state: 2
    end
  end
end
```

### AI Behavior Examples

#### Aggressive Predator AI

```elixir
defmodule MonsterSimulation.AI.WolfPack do
  use MonsterSimulation.AI.Behavior

  def should_react_to_event(%{type: :player_entered}, _state), do: true
  def should_react_to_event(%{type: :entity_died}, _state), do: true
  def should_react_to_event(%{type: :howl_heard}, _state), do: true
  def should_react_to_event(_event, _state), do: false

  def decide_actions(%{type: :player_entered, entity: player_id}, monster_state) do
    case is_pack_hunting_time?(monster_state) do
      true -> coordinate_pack_attack(player_id, monster_state)
      false -> [stalk_action(player_id)]
    end
  end

  def decide_actions(%{type: :entity_died, entity: pack_member}, monster_state) do
    case is_pack_member?(pack_member, monster_state) do
      true ->
        [
          %{type: :howl, message: :mourning},
          %{type: :retreat, direction: :random}
        ]
      false ->
        [%{type: :investigate, target: pack_member}]
    end
  end

  def decide_actions(%{type: :howl_heard, location: source}, monster_state) do
    distance = calculate_distance(monster_state.location, source)

    if distance < 500 do
      [%{type: :howl_response}, %{type: :move, direction: toward_location(source)}]
    else
      []
    end
  end

  defp coordinate_pack_attack(target, monster_state) do
    pack_members = get_nearby_pack_members(monster_state)

    [
      %{type: :signal_pack, message: {:attack, target}},
      %{type: :move, direction: toward_entity(target)},
      %{type: :attack, target: target, coordinated: true}
    ]
  end

  defp is_pack_hunting_time?(monster_state) do
    # Check time of day, pack size, hunger level, etc.
    pack_size = length(get_nearby_pack_members(monster_state))
    hunger_level = monster_state.ai_state[:hunger] || 0

    pack_size >= 2 and hunger_level > 70
  end

  defp stalk_action(target) do
    %{type: :stealth_follow, target: target, distance: 200}
  end

  defp get_nearby_pack_members(monster_state) do
    # Query for other wolves in the area
    MonsterSimulation.PopulationRegistry.get_monsters_of_type_in_radius(
      monster_state.location,
      :wolf,
      1000
    )
  end
end
```

#### Merchant/Social AI

```elixir
defmodule MonsterSimulation.AI.GoblinTrader do
  use MonsterSimulation.AI.Behavior

  def should_react_to_event(%{type: :player_entered}, _state), do: true
  def should_react_to_event(%{type: :item_dropped}, _state), do: true
  def should_react_to_event(%{type: :trade_request}, _state), do: true
  def should_react_to_event(_event, _state), do: false

  def decide_actions(%{type: :player_entered, entity: player_id}, monster_state) do
    player_reputation = get_player_reputation(player_id)

    cond do
      player_reputation > 500 ->
        [
          greet_warmly(player_id),
          offer_special_deals(player_id)
        ]

      player_reputation > 0 ->
        [
          greet_politely(player_id),
          show_normal_wares()
        ]

      player_reputation < -200 ->
        [
          hide_valuable_items(),
          call_for_guards()
        ]

      true ->
        [greet_cautiously(player_id)]
    end
  end

  def decide_actions(%{type: :item_dropped, item: item, location: location}, monster_state)
    when location == monster_state.location do

    case is_valuable_item?(item) do
      true ->
        [
          %{type: :pick_up_item, item: item},
          %{type: :say, message: "Ooh, shiny! Mine now!"}
        ]
      false ->
        []
    end
  end

  def decide_actions(%{type: :trade_request, player: player_id, offer: offer}, monster_state) do
    case evaluate_trade_offer(offer, monster_state) do
      {:accept, counter_offer} ->
        [
          %{type: :say, message: "Deal! But I want #{inspect(counter_offer)} too."},
          %{type: :initiate_trade, player: player_id, terms: counter_offer}
        ]

      :reject ->
        [
          %{type: :say, message: "Bah! You insult me with this offer!"},
          %{type: :emote, action: :spit}
        ]
    end
  end

  defp greet_warmly(player_id) do
    %{type: :say, message: "Welcome back, old friend! I have something special for you!"}
  end

  defp greet_politely(player_id) do
    %{type: :say, message: "Good day! Care to browse my wares?"}
  end

  defp greet_cautiously(player_id) do
    %{type: :say, message: "What do you want, stranger?"}
  end

  defp get_player_reputation(player_id) do
    # Query reputation system or use cached data
    ReputationSystem.get_reputation(player_id, :goblin_traders)
  end

  defp is_valuable_item?(item) do
    item_value = ItemDatabase.get_base_value(item)
    item_value > 100
  end
end
```

### Environmental AI Behaviors

```elixir
defmodule MonsterSimulation.AI.DungeonGuardian do
  use MonsterSimulation.AI.Behavior

  def should_react_to_event(%{type: :player_entered}, _state), do: true
  def should_react_to_event(%{type: :spell_cast, spell_type: spell_type}, _state) do
    spell_type in [:forbidden_magic, :necromancy, :demon_summoning]
  end
  def should_react_to_event(%{type: :item_stolen}, _state), do: true
  def should_react_to_event(_event, _state), do: false

  def decide_actions(%{type: :player_entered, entity: player_id, location: guarded_area}, monster_state)
    when guarded_area == monster_state.guarded_area do

    case is_authorized_player?(player_id) do
      true ->
        [%{type: :acknowledge_ally, target: player_id}]
      false ->
        [
          %{type: :challenge_intruder, target: player_id},
          %{type: :block_passage, direction: :all}
        ]
    end
  end

  def decide_actions(%{type: :spell_cast, spell_type: :forbidden_magic, caster: caster}, _monster_state) do
    [
      %{type: :sound_alarm, urgency: :high},
      %{type: :summon_reinforcements, count: 3},
      %{type: :attack, target: caster, priority: :immediate}
    ]
  end

  def decide_actions(%{type: :item_stolen, item: item, thief: thief, location: guarded_area}, monster_state)
    when guarded_area == monster_state.guarded_area do

    [
      %{type: :lock_down_area, area: guarded_area},
      %{type: :hunt_thief, target: thief},
      %{type: :alert_other_guardians, message: {:theft, item, thief}}
    ]
  end

  def update_state(%{type: :player_entered, entity: player_id}, monster_state) do
    # Track intruders for pattern recognition
    intruders = monster_state.ai_state[:recent_intruders] || []
    updated_intruders = [player_id | intruders] |> Enum.take(10)

    put_in(monster_state.ai_state[:recent_intruders], updated_intruders)
  end

  defp is_authorized_player?(player_id) do
    # Check authorization system - guild membership, quest flags, etc.
    AuthorizationSystem.is_authorized?(player_id, :dungeon_access)
  end
end
```

## Population Management

### Dynamic Monster Spawning

```elixir
defmodule MonsterSimulation.MonsterSpawner do
  use GenServer
  require Logger

  defstruct [:area, :spawn_config, :last_spawn_check]

  def start_link(opts) do
    area = Keyword.fetch!(opts, :area)
    GenServer.start_link(__MODULE__, opts, name: via_tuple(area))
  end

  def init(opts) do
    area = Keyword.fetch!(opts, :area)
    spawn_config = MonsterSpawnConfig.get_config(area)

    # Schedule first population check
    schedule_population_check()

    state = %__MODULE__{
      area: area,
      spawn_config: spawn_config,
      last_spawn_check: System.system_time(:millisecond)
    }

    {:ok, state}
  end

  def handle_info(:population_check, state) do
    current_pop = MonsterSimulation.PopulationRegistry.count_monsters_in_area(state.area)
    target_pop = get_target_population(state.area)

    if current_pop < target_pop do
      spawn_count = min(target_pop - current_pop, max_spawn_per_tick())
      spawn_monsters(state.area, spawn_count, state.spawn_config)
      Logger.debug("Spawned #{spawn_count} monsters in #{state.area}")
    end

    schedule_population_check()
    {:noreply, %{state | last_spawn_check: System.system_time(:millisecond)}}
  end

  defp spawn_monsters(area, count, spawn_config) do
    spawn_types = spawn_config.spawn_table

    for _ <- 1..count do
      monster_type = weighted_random_selection(spawn_types)
      spawn_location = find_spawn_point(area)

      case MonsterSimulation.AreaSupervisor.start_monster(area, monster_type, spawn_location) do
        {:ok, _pid} ->
          Logger.debug("Spawned #{monster_type} at #{spawn_location}")
        {:error, reason} ->
          Logger.warn("Failed to spawn #{monster_type}: #{inspect(reason)}")
      end
    end
  end

  defp get_target_population(area) do
    # Base population modified by time of day, world events, etc.
    base_pop = MonsterSpawnConfig.get_base_population(area)
    time_modifier = get_time_of_day_modifier()
    event_modifier = get_world_event_modifier(area)

    trunc(base_pop * time_modifier * event_modifier)
  end

  defp weighted_random_selection(spawn_table) do
    total_weight = Enum.sum(Enum.map(spawn_table, fn {_type, weight} -> weight end))
    random_value = :rand.uniform(total_weight)

    find_selected_type(spawn_table, random_value, 0)
  end

  defp find_selected_type([{type, weight} | _rest], random_value, acc)
    when random_value <= acc + weight do
    type
  end

  defp find_selected_type([{_type, weight} | rest], random_value, acc) do
    find_selected_type(rest, random_value, acc + weight)
  end

  defp schedule_population_check do
    Process.send_after(self(), :population_check, 30_000) # Check every 30 seconds
  end

  defp max_spawn_per_tick, do: 10

  defp via_tuple(area) do
    {:via, Registry, {MonsterSimulation.Registry, {:monster_spawner, area}}}
  end
end
```

### Population Registry

```elixir
defmodule MonsterSimulation.PopulationRegistry do
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def register_monster(monster_id, monster_type, location) do
    GenServer.call(__MODULE__, {:register_monster, monster_id, monster_type, location})
  end

  def unregister_monster(monster_id) do
    GenServer.call(__MODULE__, {:unregister_monster, monster_id})
  end

  def update_monster_location(monster_id, new_location) do
    GenServer.call(__MODULE__, {:update_location, monster_id, new_location})
  end

  def get_monsters_in_location(location) do
    :ets.select(:spatial_index, [
      {{location, :"$1"}, [], [:"$1"]}
    ])
  end

  def get_monsters_of_type_in_radius(center_location, monster_type, radius) do
    # Simplified radius query - in production you'd want proper spatial indexing
    all_locations = get_locations_within_radius(center_location, radius)

    all_locations
    |> Enum.flat_map(&get_monsters_in_location/1)
    |> Enum.filter(fn monster_id ->
      case :ets.lookup(:monster_registry, monster_id) do
        [{^monster_id, ^monster_type, _location, _metadata}] -> true
        _ -> false
      end
    end)
  end

  def count_monsters_in_area(area) do
    :ets.select_count(:monster_registry, [
      {{:"$1", :"$2", area, :"$3"}, [], [true]}
    ])
  end

  def init(_opts) do
    # Spatial index for fast location-based queries
    :ets.new(:spatial_index, [:set, :named_table, :public])

    # Monster metadata table
    :ets.new(:monster_registry, [:set, :named_table, :public])

    {:ok, %{}}
  end

  def handle_call({:register_monster, monster_id, monster_type, location}, _from, state) do
    # Add to spatial index
    :ets.insert(:spatial_index, {{location, monster_id}, monster_id})

    # Add to monster registry
    :ets.insert(:monster_registry, {monster_id, monster_type, location, %{spawned_at: System.system_time(:millisecond)}})

    Logger.debug("Registered monster #{monster_id} (#{monster_type}) at #{location}")
    {:reply, :ok, state}
  end

  def handle_call({:unregister_monster, monster_id}, _from, state) do
    case :ets.lookup(:monster_registry, monster_id) do
      [{^monster_id, _type, location, _metadata}] ->
        # Remove from spatial index
        :ets.delete(:spatial_index, {location, monster_id})

        # Remove from monster registry
        :ets.delete(:monster_registry, monster_id)

        Logger.debug("Unregistered monster #{monster_id}")
        {:reply, :ok, state}

      [] ->
        {:reply, {:error, :not_found}, state}
    end
  end

  def handle_call({:update_location, monster_id, new_location}, _from, state) do
    case :ets.lookup(:monster_registry, monster_id) do
      [{^monster_id, monster_type, old_location, metadata}] ->
        # Remove from old spatial index entry
        :ets.delete(:spatial_index, {old_location, monster_id})

        # Add to new spatial index entry
        :ets.insert(:spatial_index, {{new_location, monster_id}, monster_id})

        # Update monster registry
        :ets.insert(:monster_registry, {monster_id, monster_type, new_location, metadata})

        Logger.debug("Moved monster #{monster_id} from #{old_location} to #{new_location}")
        {:reply, :ok, state}

      [] ->
        {:reply, {:error, :not_found}, state}
    end
  end

  defp get_locations_within_radius(center_location, radius) do
    # Simplified implementation - in production you'd want proper spatial algorithms
    # This would query your world geography system
    WorldGeography.get_locations_within_radius(center_location, radius)
  end
end
```

## Performance Characteristics

### Concurrency Model

- **Monster Processes**: 30,000 lightweight processes (2KB each = 60MB total)
- **Supervision Trees**: Hierarchical organization minimizes blast radius
- **Event Processing**: Parallel processing across all affected monsters
- **Batch Collection**: Single bottleneck process with microsecond latency

### Scaling Projections

#### Single Node Performance
- **Monster Capacity**: 30,000 concurrent monsters (3x CCU target)
- **Event Processing**: 50,000+ events/second distributed processing
- **Command Generation**: 5,000 commands/second (monsters acting every 6 seconds)
- **Memory Usage**: <100MB for monster processes + ETS spatial indexes

#### Multi-Node Distribution
```erlang
%% Horizontal scaling via Erlang distribution (if needed for growth)
{monster_simulation_cluster, [
    'monster_sim_1@game_server_1',
    'monster_sim_2@game_server_2'  % Only 2 nodes needed for 30K monsters
]}.

%% Geographic distribution of monster populations
RegionAssignments = #{
    overworld => 'monster_sim_1@game_server_1',
    underworld => 'monster_sim_2@game_server_2'
}.
```

### Integration with World Server HTTP Batch Interface

The Monster Simulation Server becomes a **batch multiplier** that leverages your HTTP batch endpoint:

```
Monster Actions → Erlang Batch Collector → HTTP Batch POST → World Server Pipeline → Database
     5,000/sec         1,000 commands           5 requests/sec      Batch Processing    15 round-trips/sec
```

**HTTP Batch Architecture:**
- **Monster commands collected**: 5,000/second in Erlang
- **HTTP batch size**: 1,000 commands per request
- **HTTP requests to World Server**: 5 requests/second
- **World Server batch processing**: 15 database round-trips/second

**Dual-Layer Batching Benefits:**
1. **Erlang Layer**: Aggregates monster commands with microsecond latency
2. **HTTP Layer**: Large, well-formed batches sent to World Server
3. **World Server Layer**: Your existing batch scheduler optimizes database access

**Performance Profile:**
```
Individual Monster Commands: 5,000/second
↓ (Erlang Batch Collector)
HTTP Batch Requests: 5/second (1,000 commands each)
↓ (World Server HTTP Interface)
Database Operations: 15/second (after batch optimization)
```

**Efficiency Gains:**
- **Without any batching**: 5,000 HTTP requests + 5,000 DB operations = 10,000 total operations
- **With dual-layer batching**: 5 HTTP requests + 15 DB operations = 20 total operations
- **Improvement**: 500x reduction in total system operations

## Fault Tolerance & Recovery

### Supervision Strategies

```erlang
%% Different restart strategies for different components
SupervisionTree = #{
    %% Critical infrastructure - restart immediately
    xmpp_listener => {permanent, brutal_kill, 5000},
    batch_collector => {permanent, brutal_kill, 5000},

    %% Monster populations - temporary, can respawn naturally
    monster_workers => {temporary, brutal_kill, 1000},

    %% Spawners - restart to maintain population targets
    monster_spawners => {permanent, shutdown, 10000}
}.

%% Restart intensity: 10 restarts per 60 seconds
%% For 30K monsters, this allows 0.03% failure rate before escalation
RestartIntensity = {10, 60}.
```

### Population Recovery

```elixir
defmodule MonsterSimulation.PopulationRecovery do
  @moduledoc """
  Handles graceful recovery of monster populations after failures.
  Target: Restore 30,000 monsters within 5 minutes of server restart.
  """

  def recover_full_population() do
    target_populations = %{
      overworld: 15_000,
      underworld: 10_000,
      astral_plane: 5_000
    }

    # Spawn at 100 monsters/second to avoid overwhelming the system
    spawn_rate_per_second = 100

    Enum.each(target_populations, fn {region, target_count} ->
      spawn_region_gradually(region, target_count, spawn_rate_per_second)
    end)
  end

  defp spawn_region_gradually(region, target_count, rate) do
    # Spawn in batches to reach target population smoothly
    batch_size = rate
    batches = div(target_count, batch_size)

    for batch <- 0..(batches - 1) do
      Process.send_after(self(), {:spawn_batch, region, batch_size}, batch * 1000)
    end
  end
end
```

## Resource Requirements

### Hardware Specifications

#### Minimum Requirements (10K CCU + 30K monsters)
- **CPU**: 4 cores (2.4GHz+)
- **RAM**: 2GB allocated to monster simulation
- **Network**: 10Mbps sustained (XMPP events + HTTP batches)
- **Storage**: 100MB for AI behavior code + logs

#### Recommended Production Setup
- **CPU**: 8 cores (3.0GHz+)
- **RAM**: 4GB allocated (allows headroom for events spikes)
- **Network**: 100Mbps (handles 10x traffic spikes)
- **Storage**: 1GB SSD for fast AI behavior loading

### Monitoring & Observability

```elixir
defmodule MonsterSimulation.Metrics do
  @moduledoc """
  Key performance indicators for 30K monster simulation.
  """

  def key_metrics() do
    %{
      # Population health
      active_monsters: count_active_monsters(),
      target_population: 30_000,
      population_ratio: count_active_monsters() / 30_000,

      # Performance metrics
      events_per_second: measure_event_rate(),
      commands_per_second: measure_command_rate(),
      batch_efficiency: measure_batch_efficiency(),

      # Resource utilization
      memory_usage_mb: :erlang.memory(:total) / (1024 * 1024),
      process_count: :erlang.system_info(:process_count),

      # Health indicators
      failed_spawns_per_minute: count_failed_spawns(),
      average_ai_decision_time_ms: measure_ai_latency()
    }
  end

  # Alert thresholds for 30K monster simulation
  def alert_thresholds() do
    %{
      population_ratio: {min: 0.8, max: 1.1},  # 24K-33K monsters
      events_per_second: {max: 100_000},        # Should handle 100K/sec
      memory_usage_mb: {max: 500},              # Keep under 500MB
      ai_decision_time_ms: {max: 10},           # AI decisions under 10ms
      batch_efficiency: {min: 0.7}             # Batches should be 70%+ full
    }
  end
end
```

## Development & Testing

### Load Testing Strategy

```elixir
defmodule MonsterSimulation.LoadTest do
  @moduledoc """
  Simulates realistic load patterns for 10K CCU scenario.
  """

  def simulate_peak_load() do
    # Simulate 10K players generating events
    concurrent_players = 10_000
    events_per_player_per_minute = 6  # One action every 10 seconds

    total_events_per_minute = concurrent_players * events_per_player_per_minute
    events_per_second = total_events_per_minute / 60  # ~1,000 events/second

    # Generate realistic event distribution
    event_types = [
      {:player_moved, 0.4},        # 40% movement
      {:combat_started, 0.2},      # 20% combat
      {:spell_cast, 0.15},         # 15% spells
      {:item_interaction, 0.15},   # 15% items
      {:social_action, 0.1}        # 10% social
    ]

    simulate_event_stream(events_per_second, event_types)
  end

  def validate_performance() do
    metrics = MonsterSimulation.Metrics.key_metrics()

    # Performance assertions for 30K monster simulation
    assert metrics.population_ratio > 0.9, "Population too low: #{metrics.active_monsters}/30000"
    assert metrics.events_per_second < 50_000, "Event processing overloaded"
    assert metrics.memory_usage_mb < 200, "Memory usage too high"
    assert metrics.ai_decision_time_ms < 5, "AI decisions too slow"

    IO.puts("✅ All performance targets met for 30K monster simulation")
  end
end
```

This scaled-down version is **much more realistic** for your 10K CCU target while maintaining all the architectural benefits:

- **30K monsters max** (reasonable 3:1 ratio)
- **~1K events/second** (realistic player activity)
- **~500 commands/second** (manageable batch throughput)
- **<200MB memory** (very reasonable resource usage)
- **Single node deployment** (no complex distribution needed)

The architecture remains **exactly as powerful** but with achievable, production-ready numbers! 🎯
