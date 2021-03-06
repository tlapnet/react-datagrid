"use strict";

import React from "react";
import PropTypes from "prop-types";
import autobind from "./autobind";
import deepClone from "./deepClone";

class Select extends React.Component {
	constructor(props) {
		super(props);
		autobind(this);
		this.tags = [];
		this.state = {
			options: [],
			showMenu: false,
			selectedMenuItemIndex: -1,
			input: "",
			focus: false,
			simpleValueCache: {}//this is label cache for values
		};
	}

	componentDidMount() {
		if (this.props.simpleValue) {
			this._loadData("");//this will also set the simpleValueCache
		}
	}

	componentDidUpdate() {
		if (this.menu && this.component) {
			this.menu.style.width = this.component.clientWidth + "px";
		}
	}

	/***INPUT FIELD***/

	onInputChange(e) {
		let input = e.target.value;
		this.setState({input: input});
		this._showMenu(input);
	}

	onInputKeyDown(e) {
		//backspace & ve are in multi select mode & we are at the beginning of the line
		if (e.keyCode === 8 && e.target.selectionStart <= 0 && this.props.multi) {
			//Remove the last value
			const values = deepClone(this._getSanitizeValue());
			values.splice(-1);
			this._saveValue(values);
		}

		//Instead of onBlur use 'tab', since onBlur clashes with loosing focus when clicking outside to menu...
		if (e.keyCode === 9) {
			this._hideMenu();
		}

		//Arrow down
		if (!this.state.showMenu && e.keyCode === 40) {
			this._showMenu();
		}
	}

	onInputClick() {
		this._showMenu();
	}

	_getPlaceholder() {
		if (!this.props.placeholder) {
			return null;
		}
		if (!this.props.multi) {
			return this.props.placeholder;
		}
		if (this.props.multi && this._getSanitizeValue().length === 0) {
			return this.props.placeholder;
		}
		return null;
	}

	onFocus() {
		this.setState({focus: true});
	}

	onBlur() {
		this.setState({focus: false});
	}

	renderInput() {
		//Use input value if we are showing menu or we are handling multi value select
		//otherwise just show the value of the props.value particularly the option label
		let inputValue = this.state.showMenu || this.props.multi ? this.state.input : this._getSanitizeValue()[this.props.labelKey];
		if (!inputValue) {
			inputValue = "";
		}
		return <input value={inputValue}
			className="form-control"
			disabled={this.props.disabled}
			placeholder={this._getPlaceholder()}
			onClick={this.onInputClick}
			onChange={this.onInputChange}
			onFocus={this.onFocus}
			onBlur={this.onBlur}
			onKeyDown={this.onInputKeyDown}/>;
	}

	/***TAG***/

	onClickTag(value) {
		//Remove the value from values
		const values = this._getSanitizeValue().filter(v => v[this.props.valueKey] !== value);
		this._saveValue(values);
	}

	renderTag(i, key) {
		return <span className="m-r-5 label label-primary label-lg" key={key}>
			{this.props.valueRenderer(this.props, i)}
			<span className="tag-remove clickable" onClick={this.onClickTag.bind(this, i[this.props.valueKey])}>
				{" "}
				<i className={this.props.icons.removeTag}/>
			</span>
		</span>;
	}

	renderTags() {
		if (this.props.multi) {
			const sanitizeValue = this._getSanitizeValue();
			if (sanitizeValue.length === 0) {
				return null;
			}
			return <span className="tags">{sanitizeValue.map(this.renderTag)}</span>;
		} else {
			return null;
		}
	}

	/***SAVING / LOADING DATA***/

	_loadData(input) {
		this.props.loadOptions(input, (err, data) => {
			if (!err) {
				this._setupSimpleValueLabelCache(data.options);
				let options = data.options.filter(this.selectValuesFilter.bind(this, this._getSanitizeValue()));
				if (this.props.creatable && options.length === 0) {
					options.push({
						creatable: true,
						[this.props.valueKey]: "create",
						[this.props.labelKey]: this.props.promptTextCreator(input)
					});
				}
				this.setState({options: options});
			}
		});
	}

	_setupSimpleValueLabelCache(options) {
		if (this.props.simpleValue) {
			const simpleValueCache = {};
			options.forEach(o => {
				simpleValueCache[o[this.props.valueKey]] = o[this.props.labelKey];
			});
			this.setState({simpleValueCache: simpleValueCache});
		}
	}

	_fireValueChange(index) {
		let value = this.state.options[index];
		if (!value) {
			return;
		}
		if (value.creatable) {
			value = {[this.props.valueKey]: this.state.input, [this.props.labelKey]: this.state.input};
		}
		if (this.props.multi) {
			const values = deepClone(this._getSanitizeValue());
			values.push(value);
			this._saveValue(values);
		} else {
			this._saveValue(value);
		}
	}

	_saveValue(value) {
		if (this.props.simpleValue) {
			if (this.props.multi) {
				this.props.onChange(value.map(v => v[this.props.valueKey]));
			} else {
				if (value !== null) {
					this.props.onChange(value[this.props.valueKey]);
				} else {
					this.props.onChange(null);
				}
			}
		} else {
			this.props.onChange(value);
		}
	}

	_setInputToSelected(index) {
		if (this.state.options.length > index && this.state.options[index] && !this.state.options[index].creatable) {
			this.setState({selectedMenuItemIndex: index, input: this.state.options[index][this.props.labelKey]});
		}
	}

	_getSimpleValueLabelFromCache(simpleValue) {
		if (this.state.simpleValueCache.hasOwnProperty(simpleValue)) {
			return this.state.simpleValueCache[simpleValue];
		} else {
			return simpleValue;
		}
	}

	_getSanitizedSimpleValue(simpleValue) {
		if (typeof simpleValue === "string") {
			return {
				[this.props.valueKey]: simpleValue,
				[this.props.labelKey]: this._getSimpleValueLabelFromCache(simpleValue)
			};
		} else if (typeof simpleValue === "number") {
			return {
				[this.props.valueKey]: simpleValue,
				[this.props.labelKey]: this._getSimpleValueLabelFromCache(simpleValue)
			};
		} else if (simpleValue === null) {
			return {[this.props.valueKey]: null, [this.props.labelKey]: ""};
		} else {
			return {
				[this.props.valueKey]: JSON.stringify(simpleValue),
				[this.props.labelKey]: JSON.stringify(simpleValue)
			};
		}
	}

	_getSanitizeValue() {
		let retval = null;
		if (this.props.multi) {
			if (Array.isArray(this.props.value)) {
				if (this.props.simpleValue) {
					retval = this.props.value.map(this._getSanitizedSimpleValue);
				} else {
					retval = this.props.value;
				}
			} else {
				retval = [];
			}
		} else {
			if (this.props.simpleValue) {
				retval = this._getSanitizedSimpleValue(this.props.value);
			} else {
				if (this.props.value === null) {
					retval = {[this.props.valueKey]: null, [this.props.labelKey]: ""};
				} else if (typeof this.props.value === "object") {
					retval = this.props.value;
				} else {
					retval = {
						[this.props.valueKey]: JSON.stringify(this.props.value),
						[this.props.labelKey]: JSON.stringify(this.props.value)
					};
				}
			}
		}

		return retval;
	}

	/***MENU AUTOCOMPLETE***/

	onClickMenuOption(index) {
		this._fireValueChange(index);
		this._hideMenu();
	}

	onMouseOverMenuOption(index) {
		this._setInputToSelected(index);
	}

	renderMenuOption(i, key) {
		let className = "menu-option";
		if (key === this.state.selectedMenuItemIndex) {
			className += " selected";
		}

		return <div className={className} key={key} onMouseOver={this.onMouseOverMenuOption.bind(this, key)}
			onClick={this.onClickMenuOption.bind(this, key)}>{this.props.optionRenderer(this.props, i)}</div>;
	}

	onClickHider() {
		this._hideMenu();
	}

	selectValuesFilter(itemSelected, v) {
		if (this.props.multi) {
			if (v.hasOwnProperty(this.props.valueKey)) {
				return !itemSelected.map(x => x[this.props.valueKey] || !x.hasOwnProperty(this.props.valueKey)).includes(v[this.props.valueKey]);
			}
		}
		return true;
	}

	renderMenu() {
		if (this.state.showMenu) {
			let style = {};
			if (this.props.menuStyleFixed) {
				style = {position: "fixed", zIndex: 999999};
			} else {
				style = {position: "relative"};
			}
			return <div style={style}>
				<div style={{top: 0, left: 0, right: 0, bottom: 0, position: "fixed"}} onClick={this.onClickHider}/>
				<div className="menu" ref={menu => this.menu = menu}>
					{this.state.options.map(this.renderMenuOption)}
				</div>
			</div>;
		} else {
			return null;
		}
	}

	_showMenu(input) {
		if (this.props.disabled) {
			return;
		}
		this._loadData(input ? input : "");
		this.setState({showMenu: true});
		window.addEventListener("keydown", this.onKeyListener);
	}

	_hideMenu() {
		if (this.props.multi) {
			this.setState({showMenu: false, input: "", selectedMenuItemIndex: -1});
		} else {
			this.setState({
				showMenu: false,
				input: "",
				selectedMenuItemIndex: -1
			});
		}
		window.removeEventListener("keydown", this.onKeyListener);
	}

	/***KEYBOARD EVENTS FOR MENU***/

	onKeyListener(e) {
		if (e.keyCode === 27) {//escape
			this._hideMenu();
		}

		if (e.keyCode === 13) {//enter hide menu but before save the value
			this._fireValueChange(this.state.selectedMenuItemIndex);
			this._hideMenu();
		}

		if (e.keyCode === 38) {//down key must go up the index since the menu is render topdown
			if (this.state.selectedMenuItemIndex > 0) {
				this.setState({selectedMenuItemIndex: this.state.selectedMenuItemIndex - 1});
			} else {
				this.setState({selectedMenuItemIndex: this.state.options.length - 1});
			}
			this._setInputToSelected(this.state.selectedMenuItemIndex);
		}

		if (e.keyCode === 40) {//up key must go down the index since the menu is render topdown
			if (this.state.selectedMenuItemIndex < this.state.options.length - 1) {
				this.setState({selectedMenuItemIndex: this.state.selectedMenuItemIndex + 1});

			} else {
				this.setState({selectedMenuItemIndex: 0});
			}
			this._setInputToSelected(this.state.selectedMenuItemIndex);
		}
	}

	/***BUTTONS***/

	onCaretDown() {
		if (this.state.showMenu) {
			this._hideMenu();
		} else {
			this._showMenu(null);
		}
	}

	onClear() {
		this._saveValue(this.props.multi ? [] : null);
		this._hideMenu();
	}

	renderClearable() {
		if (!this.props.clearable) {
			return null;
		}
		if (this.props.multi) {
			if (this._getSanitizeValue().length === 0) {
				return null;
			}
		} else {
			if (!this.props.value) {
				return null;
			}
		}
		return <div className="input-group-addon" onClick={this.onClear}><i className={this.props.icons.clear}/></div>;
	}

	_getClassName() {
		let className = "simple-select";
		if (this.props.className) {
			className += " " + this.props.className;
		}
		if (this.props.disabled) {
			className += " disabled";
		}
		if (this.state.focus) {
			className += " focus";
		}
		return className;
	}

	onClickSelectLine() {
		// if (this.state.showMenu) {
		// this._hideMenu();
		// } else {
		// this._showMenu();
		// }
	}

	render() {
		return <div className={this._getClassName()} style={{position: "relative"}}
			ref={component => this.component = component}>
			{this.renderTags()}
			<div className="input-group" style={{flex: ""}} onClick={this.onClickSelectLine}>
				{this.renderInput()}
				{this.renderClearable()}
				<div className="input-group-addon" onClick={this.onCaretDown}>
					<i className={this.props.icons.caret}/>
				</div>
			</div>

			{this.renderMenu()}
		</div>;
	}
}

Select.defaultProps = {
	valueRenderer: function (props, item) {
		return item[props.labelKey];
	},
	optionRenderer: function (props, item) {
		return item[props.labelKey];
	},
	promptTextCreator: function (label) {
		return "Create \"" + label + "\"";
	},
	icons: {
		caret: "icon-lg icon-m icon-m-caret-down",
		removeTag: "icon-m icon-m-close",
		clear: "icon-m icon-m-close"
	},
	className: "",
	labelKey: "label",
	valueKey: "value"
};

Select.propTypes = {
	multi: PropTypes.bool,
	clearable: PropTypes.bool,
	creatable: PropTypes.bool,
	className: PropTypes.string,
	valueKey: PropTypes.string,
	labelKey: PropTypes.string,
	value: PropTypes.any,
	icons: PropTypes.shape({
		caret: PropTypes.string.isRequired,
		removeTag: PropTypes.string.isRequired,
		clear: PropTypes.string.isRequired
	}),
	disabled: PropTypes.any,
	loadOptions: PropTypes.func.isRequired,
	onChange: PropTypes.func.isRequired,
	valueRenderer: PropTypes.func,
	optionRenderer: PropTypes.func,
	promptTextCreator: PropTypes.func,
	menuStyleFixed: PropTypes.bool,
	placeholder: PropTypes.string,
	simpleValue: PropTypes.bool
};

export default Select;
