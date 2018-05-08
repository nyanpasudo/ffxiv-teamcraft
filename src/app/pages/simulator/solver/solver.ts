import {CraftingActionsRegistry} from '../model/crafting-actions-registry';
import {Simulation} from '../simulation/simulation';
import {CraftingAction} from '../model/actions/crafting-action';

export class Solver {

    private static readonly MUTATION_RATE = .05;

    private static readonly POPULATION_SIZE = 1000;

    private static readonly ITERATIONS = 500;

    private population: number[][];

    constructor(private readonly simulation: Simulation) {
    }

    public run(): CraftingAction[] {
        this.initPopulation();
        for (let _ = 0; _ < Solver.ITERATIONS; _++) {
            console.log('New generation !', _);
            this.newGeneration();
        }
        return this.genomeToRotation(this.pickBest());
    }

    private newGeneration(): void {
        // Pick 500 genoms as "survivors"
        const newPopulation = [];
        let offsprings = [];
        while (newPopulation.length < Solver.POPULATION_SIZE / 2) {
            const firstCandidate = this.pickRandom();
            const secondCandidate = this.pickRandom();
            console.log(firstCandidate, secondCandidate);
            const winner = this.tournament(firstCandidate, secondCandidate);
            newPopulation.push(winner);
            // Remove winner from population to avoid having him twice in the result.
            this.population = this.population.filter(row => JSON.stringify(row) !== JSON.stringify(winner));
        }
        // Then, breed them
        while (offsprings.length < Solver.POPULATION_SIZE / 2) {
            const p1 = newPopulation[Math.floor(Math.random() * newPopulation.length)];
            const p2 = newPopulation[Math.floor(Math.random() * newPopulation.length)];
            let newOffsprings: [number[], number[]];
            // Use parent with shortest genome as parent 1, use p1 as first if they are equal.
            if (p1.length > p2.length) {
                newOffsprings = this.crossover(p2, p1);
            } else {
                newOffsprings = this.crossover(p1, p2);
            }
            offsprings.push(...newOffsprings);
        }
        // The, mutation time !
        offsprings = offsprings.map(genome => {
            // Should this one mutate?
            if (Math.random() <= Solver.MUTATION_RATE) {
                return this.mutate(genome);
            }
            return genome;
        });
        newPopulation.push(...offsprings);
        this.population = newPopulation;
    }

    private mutate(genome: number[]): number[] {
        const indexToMutate = Math.ceil(Math.random() * genome.length);
        genome[indexToMutate] = this.newChromosome();
        return genome;
    }

    private crossover(parentA: number[], parentB: number[]): [number[], number[]] {
        const res: [number[], number[]] = [[], []];
        const crossoverPoint = Math.floor(parentA.length);
        res[0] = parentA.slice(0, crossoverPoint).concat(parentB.slice(crossoverPoint));
        res[1] = parentB.slice(0, crossoverPoint).concat(parentA.slice(crossoverPoint));
        return res;
    }

    /**
     * The routnament function is a simple weighted random base don each rotation fitness note.
     * @param {number[]} a
     * @param {number[]} b
     * @returns {number[]}
     */
    private tournament(a: number[], b: number[]): number[] {
        const noteA = this.fitness(a);
        const noteB = this.fitness(b);
        const totalNote = noteA + noteB;
        const random = Math.ceil(Math.random() * totalNote);
        if (random > noteA) {
            return a;
        }
        return b;
    }

    private fitness(genome: number[]): number {
        // Minimum note is 1, to let a chance for failing rotations as they might have some good things.
        let note = 1;
        const simulation = new Simulation(this.simulation.recipe, this.genomeToRotation(genome), this.simulation.crafterStats,
            this.simulation.hqIngredients);
        simulation.run();
        // If simulation is a success, add some points
        if (simulation.success) {
            note += 5;
        }
        // Add points relative to quality% done
        note += Math.ceil(simulation.quality / simulation.recipe.quality * 10);
        note -= Math.ceil(simulation.steps.length / 20);
        return note;
    }

    private pickRandom(): number[] {
        return this.population[Math.floor(Math.random() * this.population.length)];
    }

    private pickBest(): number[] {
        const successOnly = this.population.filter(genome => {
            const simulation = new Simulation(this.simulation.recipe, this.genomeToRotation(genome), this.simulation.crafterStats,
                this.simulation.hqIngredients);
            simulation.run();
            return simulation.success === true;
        });
        // If there's at least one successfull, return it.
        if (successOnly.length > 0) {
            return successOnly.sort((a, b) => this.fitness(a) > this.fitness(b) ? 1 : -1)[0];
        }
        // Else return the best unsuccessful rotation.
        return this.population.sort((a, b) => this.fitness(a) > this.fitness(b) ? 1 : -1)[0];
    }

    private genomeToRotation(genome: number[]): CraftingAction[] {
        return genome.map(index => CraftingActionsRegistry.ALL_ACTIONS[index].action);
    }

    private initPopulation(): void {
        this.population = [];
        for (let i = 0; i < Solver.POPULATION_SIZE; i++) {
            this.population.push(this.newGenome());
        }
    }

    private newGenome(): number[] {
        const genome = [];
        let simulation: Simulation;
        // Run simulation with the newly added chromosome, only stop once simulation is success or fail.
        do {
            genome.push(this.newChromosome());
            simulation = new Simulation(this.simulation.recipe, this.genomeToRotation(genome), this.simulation.crafterStats,
                this.simulation.hqIngredients);
            simulation.run(true);
        } while (simulation.success === undefined);
        return genome;
    }

    private newChromosome(): number {
        // Each action is represented by an simple index, easier for mutations.
        let actionIndex = Math.floor(Math.random() * CraftingActionsRegistry.ALL_ACTIONS.length);
        while (this.simulation.success === undefined &&
        !CraftingActionsRegistry.ALL_ACTIONS[actionIndex].action.canBeUsed(this.simulation)) {
            actionIndex = Math.floor(Math.random() * CraftingActionsRegistry.ALL_ACTIONS.length);
        }
        return actionIndex;
    }
}
