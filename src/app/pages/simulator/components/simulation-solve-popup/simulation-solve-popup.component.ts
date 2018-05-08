import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material';
import {Simulation} from '../../simulation/simulation';
import {CraftingAction} from '../../model/actions/crafting-action';
import {Solver} from 'app/pages/simulator/solver/solver';

@Component({
    selector: 'app-simulation-solve-popup',
    templateUrl: './simulation-solve-popup.component.html',
    styleUrls: ['./simulation-solve-popup.component.scss']
})
export class SimulationSolvePopupComponent implements OnInit {

    public rotation: CraftingAction[];

    constructor(@Inject(MAT_DIALOG_DATA) private simulation: Simulation) {
    }

    ngOnInit(): void {
        this.rotation = new Solver(this.simulation).run();
    }

}
