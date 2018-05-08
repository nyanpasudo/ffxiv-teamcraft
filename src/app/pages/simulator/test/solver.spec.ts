import {alc_70_350_stats, infusionOfMind_Recipe} from './mocks';
import {Simulation} from '../simulation/simulation';
import {Solver} from '../solver/solver';

describe('Craft solver tests', () => {
    it('should be able to find a rotation on craft', () => {
        const simulation = new Simulation(infusionOfMind_Recipe, [], alc_70_350_stats);
        const solver = new Solver(simulation);
        const rotation = solver.run();
        const result = new Simulation(infusionOfMind_Recipe, rotation, alc_70_350_stats).run();
        // Expect all to succeed
        expect(result.success).toBe(true);
        // Expect more than 50% avg quality on solved rotations
        expect(result.hqPercent).toBeGreaterThan(50);
    })
});
