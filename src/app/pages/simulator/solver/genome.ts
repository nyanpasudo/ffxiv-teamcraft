import {Simulation} from '../simulation/simulation';
import {CraftingAction} from '../model/actions/crafting-action';
import {CraftingActionsRegistry} from '../model/crafting-actions-registry';
import {InnerQuiet} from '../model/actions/buff/inner-quiet';
import {ByregotsBlessing} from '../model/actions/quality/byregots-blessing';
import {Class} from '@kaiu/serializer';
import {WhistleWhileYouWork} from '../model/actions/buff/whistle-while-you-work';
import {BrandAction} from '../model/actions/progression/brand-action';
import {NameOfBuff} from '../model/actions/buff/name-of-buff';
import {HeartOfTheCrafter} from '../model/actions/buff/heart-of-the-crafter';

export class Genome {

    private static BAD_ACTIONS: Class<CraftingAction>[] = [
        WhistleWhileYouWork,
        BrandAction,
        NameOfBuff,
        HeartOfTheCrafter,
    ];

    private static GOOD_ACTIONS: Class<CraftingAction>[] = [
        ByregotsBlessing,
        InnerQuiet,
    ];

    private _fitness: number;

    constructor(private readonly simulation: Simulation, private _chromosomes: number[] = []) {
        if (_chromosomes.length === 0) {
            let sim = simulation;
            do {
                this.chromosomes.push(this.newChromosome());
                sim = new Simulation(this.simulation.recipe, this.rotation, this.simulation.crafterStats,
                    this.simulation.hqIngredients);
                sim.run(true);
            } while (sim.success === undefined);
        }
    }

    public get fitness(): number {
        if (this._fitness === undefined) {
            this._fitness = this.computeFitness();
        }
        return this._fitness;
    }

    public get chromosomes(): number[] {
        return this._chromosomes;
    }

    public get rotation(): CraftingAction[] {
        return this.chromosomes.map(index => CraftingActionsRegistry.ALL_ACTIONS[index].action);
    }

    private computeFitness(): number {
        // Starting note at 50 so we can have lower values without being negative (for weighted random in selection algorithm).
        let note = 50;
        const simulation = new Simulation(this.simulation.recipe, this.rotation, this.simulation.crafterStats,
            this.simulation.hqIngredients);
        simulation.run();
        // If simulation is a success, add some points
        if (simulation.success) {
            note += 100;
        }
        // Add points relative to quality% done
        note += Math.ceil(simulation.quality / simulation.recipe.quality * 40);
        note -= Math.ceil(simulation.steps.length / 20);
        // Penalty for using or not using some skills
        for (const action of this.rotation) {
            for (const goodAction of Genome.GOOD_ACTIONS) {
                let found = false;
                if (action instanceof goodAction) {
                    note += 20;
                    found = true;
                }
                if (found = false) {
                    note -= 5;
                }
            }
            for (const badAction of Genome.BAD_ACTIONS) {
                let found = false;
                if (action instanceof badAction) {
                    note -= 20;
                    found = true;
                }
            }
        }
        // Now, evaluate reliability
        const report = simulation.getReliabilityReport();
        note -= 100 - report.successPercent;
        // add a penalty for each skipped or failed steps
        note -= simulation.steps.filter(step => step.skipped || !step.success).length * 50;
        if (note < 0) {
            note = 0;
        }
        return note;
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

    public crossover(other: Genome): Genome[] {
        const res: Genome[] = [];
        const crossoverPoint = Math.floor(this.chromosomes.length);
        res[0] = new Genome(this.simulation, this.chromosomes.slice(0, crossoverPoint).concat(other.chromosomes.slice(crossoverPoint)));
        res[1] = new Genome(this.simulation, other.chromosomes.slice(0, crossoverPoint).concat(this.chromosomes.slice(crossoverPoint)));
        return res;
    }

    private mutate(): void {
        const indexToMutate = Math.ceil(Math.random() * this.chromosomes.length);
        this.chromosomes[indexToMutate] = this.newChromosome();
    }

}
