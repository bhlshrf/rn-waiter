import React, { Component } from 'react'
import { Text, View, TouchableOpacity, ScrollView } from 'react-native'
import Api from '../api';
import Loader from './Loader';
import { Actions } from 'react-native-router-flux';
import ItemButton from './ItemButton';

export default class Replacements extends Component {
    constructor(props) {
        super(props);

        this.state = {
            product: null,
            quantity: 1,

            ready: false,
            error: false,

            services: [],
            selectedService: null,
            selectedItem: null,

            tastingItems: [],
        };

        this.getQuantityOfItemMinusReplacement = this.getQuantityOfItemMinusReplacement.bind(this);
    }

    componentDidMount() {
        this.fetchDate();
    }

    fetchDate() {
        this.setState({ ready: false, error: false });

        Api.getTasting()
            .then(tastings => {
                let services = [...this.props.tastingServices];
                for (const t of tastings) {
                    for (const s of t.services) {
                        let service = services.find(x => x.service_number == s.service_number)
                        if (!service)
                            continue;
                        for (const p of s.products) {
                            let product = service.products.find(x => x.product_id == p.product_id);
                            if (product) {
                                product.replacements = [...p.replacements];
                            }
                        }
                    }
                }

                this.setState({
                    product: this.props.item,
                    quantity: this.props.item.quantity,
                    services: services,
                    tastingItems: this.props.tastingItems,
                    selectedService: this.props.selectedService,
                    ready: true,
                    error: false
                });
            }).catch(x => {
                alert(x);
                this.setState({ ready: true, error: true, });
            });
    }

    render() {
        if (!this.state.ready) return <Loader />;
        else {
            return (
                <ScrollView>
                    <View style={{ padding: 10, backgroundColor: '#fff' }}>
                        <View style={{ paddingVertical: 10, }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 20 }}>Replace Items</Text>
                        </View>

                        {this.renderTabRow()}
                        {this.renderContent()}
                        {this.renderSaveAndCancel()}
                    </View>
                </ScrollView>
            )
        }
    }

    cancel() {
        Actions.pop();
    }

    save() {
        if (this.props.onSave) {
            this.props.onSave(this.getFinalResult());
        }
        Actions.pop();
    }

    getFinalResult() {
        return {
            quantity: this.props.item.quantity == this.state.quantity ? null : this.state.quantity,
            item: this.props.item,
        };
    }
    renderSaveAndCancel() {
        return (<View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>
            <TouchableOpacity style={{ backgroundColor: 'red', flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, }}
                onPress={this.cancel.bind(this)}>
                <Text style={{ color: '#fff' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: 'green', flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, }}
                onPress={this.save.bind(this)}>
                <Text style={{ color: '#fff' }}>Save</Text>
            </TouchableOpacity>
        </View>);
    }

    renderContent() {
        return (<View style={{ padding: 10, }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', }}>
                {
                    this.getSelectedTastingItems().map(t => <Text key={t.id} style={{ paddingHorizontal: 3 }}>
                        <Text style={{ fontWeight: 'bold' }}>{t.quantity}</Text>{' ' + t.tasting_name},</Text>)
                }
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {
                    this.getSelectedService().map(s =>
                        s.products.map(p => {
                            let isSelected = s.service_number == this.state.selectedService &&
                                this.state.selectedItem &&
                                this.state.selectedItem.product_id == p.product_id;

                            let style = !isSelected ? {} : {
                                borderColor: '#66c4ff',
                                borderRadius: 1,
                                borderWidth: 2,
                                borderStyle: 'dotted',
                            };


                            return [<View style={style} key={p.product_id}>
                                <ItemButton
                                    color={p.color}
                                    title={p.product_name}
                                    quantity={this.getQuantityOfItemMinusReplacement(p)}
                                    showCount
                                    onPressMid={() => {
                                        if (this.state.selectedItem && this.state.selectedItem.product_id == p.product_id) {
                                            this.setState({ selectedItem: null });
                                        } else {
                                            this.setState({ selectedItem: p });
                                        }
                                    }}
                                />
                            </View>,
                            ...p.replacements.filter(r => r.quantity && r.quantity > 0).map(r => <ItemButton
                                key={p.product_id + '-' + r.id}
                                color={p.color}
                                title={r.product_name}
                                quantity={r.quantity}
                                showCount
                                isSelected
                            />)
                            ];
                        })
                    )
                }
            </View>

            <View style={{ height: 1, backgroundColor: '#ddd', margin: 6 }} />

            {
                this.getSelectedItemReplacements().length > 0 &&
                <View>
                    <Text>Replacments:</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {
                            this.getSelectedItemReplacements().map(r => <ItemButton
                                key={r.id}
                                color='#66c4ff'
                                title={r.product_name}
                                addAndRemove
                                onAddOrRemove={(value) => {
                                    this.handleChangeQuantityOfReplacment(value, r)
                                }}
                                showCount
                                quantity={r.quantity || 0}
                            />)
                        }
                    </View>
                </View>
            }
        </View>);
    }

    handleChangeQuantityOfReplacment(value, replacement) {
        let
            itemX = this.state.selectedItem,
            selectedService = this.state.selectedService;

        let services = [...this.state.services];
        let item = services.find(i => i.service_number == selectedService).products.find(x => x.product_id == itemX.product_id);

        let quantityLimit = this.getQuantityOfItemMinusReplacement(item);
        if (value < 0) {
            value = quantityLimit + replacement.quantity;
        }
        else if (quantityLimit == 0) {
            value = 0;
        }

        let rep = item.replacements.find(x => x.id == replacement.id);
        if (rep) {
            rep.quantity = value;
        }

        this.setState({ services: services });
    }

    getQuantityOfItemMinusReplacement(item) {
        if (!item.replacements || item.replacements.length == 0) {
            return item.quantity;
        }

        let sum = 0;
        for (const r of item.replacements) {
            sum += r.quantity || 0;
        }
        return item.quantity - sum;
    }

    getSelectedTastingItems() {
        return this.state.tastingItems.filter(t => t.services.findIndex(i => i.service_number == this.state.selectedService) != -1);
    }
    getSelectedService() {
        return this.state.services.filter(s => s.service_number == this.state.selectedService);
    }

    getSelectedItemReplacements() {
        if (this.state.selectedItem == null)
            return [];
        return this.state.selectedItem.replacements;
    }

    renderTabRow() {
        return (<ScrollView
            horizontal
            alwaysBounceHorizontal
            showsHorizontalScrollIndicator={false}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                borderBottomColor: '#ddd',
                borderBottomWidth: 1,
                paddingHorizontal: 10
            }}>
                {this.state.services.map(s => this.tabBtn(s.service_number))}
            </View>
        </ScrollView>);
    }

    tabBtn(number) {
        let style = {};
        if (this.state.selectedService == number) {
            style = {
                borderWidth: 1,
                borderColor: '#eee',
                backgroundColor: '#eee',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                borderBottomWidth: 0,
            };
        }
        return (
            <TouchableOpacity key={number} style={[{
                padding: 10,
                paddingHorizontal: 16,
            }, style]}
                onPress={() => this.setState({ selectedService: number })}>
                <Text>SRV #{number}</Text>
            </TouchableOpacity>);
    }
}
