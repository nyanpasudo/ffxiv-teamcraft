import {Simulation} from '../simulation/simulation';
import {CraftingAction} from '../model/actions/crafting-action';
import {Genome} from './genome';

export class Solver {

    private static readonly MUTATION_RATE = .01;

    private static readonly POPULATION_SIZE = 50;

    private static readonly ITERATIONS = 25;

    private population: Genome[];

    constructor(private readonly simulation: Simulation) {
    }

    public run(): CraftingAction[] {
        this.initPopulation();
        for (let _ = 0; _ < Solver.ITERATIONS; _++) {
            this.newGeneration();
        }
        const best = this.pickBest();
        return best.rotation;
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
            let newOffsprings: [Genome, Genome];
            // Use parent with shortest genome as parent 1, use p1 as first if they are equal.
            if (p1.length > p2.length) {
                newOffsprings = p2.crossover(p1);
            } else {
                newOffsprings = p1.crossover(p2);
            }
            offsprings.push(...newOffsprings);
        }
        // The, mutation time !
        offsprings = offsprings.map(genome => {
            // Should this one mutate?
            if (Math.random() <= Solver.MUTATION_RATE) {
                genome.mutate();
            }
            return genome;
        });
        newPopulation.push(...offsprings);
        this.population = newPopulation;
    }

    /**
     * The routnament function is a simple weighted random base don each rotation fitness note.
     * @param {Genome} a
     * @param {Genome} b
     * @returns {Genome}
     */
    private tournament(a: Genome, b: Genome): Genome {
        const noteA = a.fitness;
        const noteB = b.fitness;
        const totalNote = noteA + noteB;
        const random = Math.ceil(Math.random() * totalNote);
        if (random > noteA) {
            return a;
        }
        return b;
    }

    private pickRandom(): Genome {
        const weigthedArray = this.population
        // First, let's return only fitnesses
            .map((genome) => {
                return genome.fitness
            })
            // Then, each row is previous + current.
            .map((fitness, index, array) => {
                const previous = index === 0 ? 0 : array[index - 1];
                return previous + fitness;
            });
        // Last value is maximum random
        const random = Math.random() * weigthedArray[weigthedArray.length - 1];
        let resultIndex = 0;
        while (random > weigthedArray[resultIndex]) {
            resultIndex++;
        }
        return this.population[resultIndex];
    }

    private pickBest(): Genome {
        const successOnly = this.population.filter(genome => {
            const simulation = new Simulation(this.simulation.recipe, genome.rotation, this.simulation.crafterStats,
                this.simulation.hqIngredients);
            simulation.run();
            return simulation.success === true;
        });
        // If there's at least one successfull, return it.
        if (successOnly.length > 0) {
            return successOnly.sort((a, b) => a.fitness > b.fitness ? 1 : -1)[0];
        }
        // Else return the best unsuccessful rotation.
        return this.population.sort((a, b) => a.fitness > b.fitness ? 1 : -1)[0];
    }

    private initPopulation(): void {
        this.population = [];
        for (let i = 0; i < Solver.POPULATION_SIZE; i++) {
            this.population.push(new Genome(this.simulation));
        }
    }
}
