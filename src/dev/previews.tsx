import {ComponentPreview, Previews} from "@react-buddy/ide-toolbox";
import {PaletteTree} from "./palette";
import {AdjustmentPage} from "../component/AdjustmentPage.tsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/AdjustmentPage">
                <AdjustmentPage/>
            </ComponentPreview>
        </Previews>
    );
};

export default ComponentPreviews;