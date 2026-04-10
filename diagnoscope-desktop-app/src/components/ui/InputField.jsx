import './InputField.css';

/**
 * InputField — Underline-only input following the HUD aesthetic.
 */
export default function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  id,
  name,
  required = false,
  icon,
}) {
  return (
    <div className="input-field">
      {label && (
        <label className="input-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="input-field__wrapper">
        {icon && (
          <span className="material-symbols-outlined input-field__icon">{icon}</span>
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="input-field__input"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
