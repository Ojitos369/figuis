import { ViewTransition } from "react";
import { localStates, indexEffects } from "./localStates";

export const Test = () => {
    const { style } = localStates();
    indexEffects();

    return (
        <ViewTransition default="moveFront">
            <div className={`${style.testPage}`}>
                <span className={`${style.badge}`}>página · test</span>
                <h1 className={`${style.title}`}>Test Component</h1>
                <p className={`${style.subtitle}`}>
                    Página de prueba modular. Reemplaza este contenido por tu vista.
                </p>
            </div>
        </ViewTransition>
    );
};
