const html = (innerHTML: TemplateStringsArray) => {
  const template = document.createElement("template");
  template.innerHTML = innerHTML.join("");
  return document.importNode(template.content, true);
};

export class Form {
  form: HTMLFormElement;

  constructor() {
    this.form = this.createForm();
    this.addUploadFileField();
    this.addContainerFields();
    this.addNotchFields();
    this.addPhysicsEngineFields();
    this.addSubmitButton();

    document.body.append(this.form);
  }

  private createForm(): HTMLFormElement {
    const formElement = document.createElement("form");

    formElement.addEventListener("submit", (event) => {
      // Prevent the default form submission behavior

      const target = event.target as HTMLFormElement;

      // Create a FormData object, passing in the form
      const formData = new FormData(target);

      // Optionally, convert FormData to a simple object
      const formDataObj = Object.fromEntries(formData.entries());

      console.log(formDataObj);

      event.preventDefault();
      event.stopPropagation();
    });

    return formElement;
  }

  private addSubmitButton() {
    const submitButton = html`<button type="submit">Start</button>`;
    this.form?.appendChild(submitButton);
  }

  private addUploadFileField() {
    const fieldset = document.createElement("fieldset");
    fieldset.id = "fieldset-file";

    const legend = document.createElement("legend");
    legend.textContent = "CSV File";

    const inputElement = html`
      <input type="file" name="csv-file" accept=".csv, text/csv" required />
    `;

    fieldset.append(legend, inputElement);
    this.form?.appendChild(fieldset);
  }

  private addContainerFields() {
    const fieldset = document.createElement("fieldset");
    fieldset.id = "fieldset-container";

    const legend = document.createElement("legend");
    legend.textContent = "Container Details";

    const radioButtons = html`
      <label>
        <input type="radio" name="container-shape" value="cuboid" checked />
        Cuboid
      </label>
      <label>
        <input type="radio" name="container-shape" value="cylinder" />
        Cylinder
      </label>
    `;

    const cuboidFields = html`
      <div id="cuboid-fields">
        <label>
          Width
          <input type="number" name="container-width" min="0" required />
        </label>

        <label>
          Height
          <input type="number" name="container-height" min="0" required />
        </label>

        <label>
          Depth
          <input type="number" name="container-depth" min="0" required />
        </label>
      </div>
    `;

    const cylinderFields = html`
      <div id="cylinder-fields">
        <label>
          Number of Segments
          <input
            type="number"
            name="container-radius"
            min="1"
            step="1"
            required
          />
        </label>

        <label>
          Radius
          <input type="number" name="container-radius" min="0" required />
        </label>

        <label>
          Height
          <input type="number" name="container-height" min="0" required />
        </label>
      </div>
    `;

    radioButtons.querySelectorAll("input").forEach((radio) => {
      radio.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        if (target.value === "cuboid") {
          fieldset.querySelector("#cylinder-fields")?.remove();
          fieldset.append(cuboidFields.cloneNode(true));
        } else {
          fieldset.querySelector("#cuboid-fields")?.remove();
          fieldset.append(cylinderFields.cloneNode(true));
        }
      });
    });

    fieldset.append(legend, radioButtons, cuboidFields.cloneNode(true));
    this.form?.appendChild(fieldset);
  }

  private addNotchFields() {
    const fieldset = document.createElement("fieldset");
    fieldset.id = "fieldset-notch";

    const legend = document.createElement("legend");
    legend.textContent = "Notch Details";

    const checkBox = html`
      <label for="has-notch">
        <input type="checkbox" id="has-notch" name="has-notch" />
        Has Notch
      </label>
    `;

    const notchFields = html`
      <div id="notch-fields">
        <div>
          <label for="notch-x">
            <input
              type="radio"
              id="notch-x"
              name="notch-direction"
              value="x"
              checked
            />
            X-Direction
          </label>
          <label for="notch-z">
            <input type="radio" id="notch-z" name="notch-direction" value="z" />
            Z-Direction
          </label>
        </div>
        <label for="notch-width">Width</label>
        <input
          type="number"
          id="notch-width"
          name="notch-width"
          min="0"
          required
        />

        <label for="notch-height">Height</label>
        <input
          type="number"
          id="notch-height"
          name="notch-height"
          min="0"
          required
        />
      </div>
    `;

    checkBox.querySelector("input")?.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;

      if (target.checked) {
        fieldset.append(notchFields.cloneNode(true));
      } else {
        fieldset.querySelector("#notch-fields")?.remove();
      }
    });

    fieldset.append(legend, checkBox);
    this.form?.appendChild(fieldset);
  }

  private addPhysicsEngineFields() {
    const fieldset = document.createElement("fieldset");
    fieldset.id = "fieldset-engine";

    const legend = document.createElement("legend");
    legend.textContent = "Physics Engine Parameters";

    const paramsFields = html`
      <div id="engine-fields">
        <label>
          Gravity
          <input type="number" name="engine-gravity" value="-9.8" required />
        </label>

        <label>
          Friction
          <input
            type="number"
            name="engine-friction"
            value="0"
            min="0"
            required
          />
        </label>

        <label>
          Restitution
          <input
            type="number"
            name="engine-restitution"
            value="0"
            min="0"
            max="1"
            required
          />
        </label>

        <label>
          Mesh-Body Scale
          <input type="number" name="engine-Scale" value="1" min="1" required />
        </label>
      </div>
    `;

    fieldset.append(legend, paramsFields);
    this.form?.appendChild(fieldset);
  }
}
