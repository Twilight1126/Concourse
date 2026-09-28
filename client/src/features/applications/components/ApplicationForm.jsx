import { useState } from "react";
import './ApplicationForm.css'

const EMPTY_FORM = {
    company_name: '',
    job_title: '',
}

function ApplicationForm({ onCreate, isSubmitting }) {
    const [formValues, setFormValues] = useState(EMPTY_FORM)

    function handleChange(event) {
        const { name, value } = event.target
        // Update the field that matches the input's name.
        setFormValues((currentValues) => ({
            ...currentValues,
            [name]: value,
        }))
    }
    async function handleSubmit(event) {
        event.preventDefault()

        const wasCreated = await onCreate(formValues)
        // Clear the form only after the API creates the record.
        if (wasCreated) {
            setFormValues(EMPTY_FORM)
        }
    }

    return (
        <form className="application-form" onSubmit={handleSubmit}>
            <label className="application-form__field">
                Company name
                <input
                    className="application-form__input"
                    name="company_name"
                    value={formValues.company_name}
                    onChange={handleChange}
                    required
                />
            </label>

            <label className="application-form__field">
                Job title
                <input
                    className="application-form__input"
                    name="job_title"
                    value={formValues.job_title}
                    onChange={handleChange}
                    required
                />
            </label>

            <button
                className="application-form__submit"
                type="submit"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Adding…' : 'Add application'}
            </button>

        </form>
    )
}

export default ApplicationForm