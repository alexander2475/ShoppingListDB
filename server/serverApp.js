const http = require('http').createServer();

const io = require('socket.io')(http, {
	cors: {origin: '*'}
});

const { error } = require('console');
const mongoose = require('mongoose');

const grocerySchema = new mongoose.Schema({
	item: String,
	quantity: Number,
	dateRO: {type: Date, default: Date.now},
	store: String
});

const groceryModel = mongoose.model('groceryModel', grocerySchema, 'Groceries');

main().catch(err => console.log(err));

async function main(){
	await mongoose.connect('mongodb://localhost:27017/ShoppingList');
}

io.on('connection', (socket) => {
	console.log('Server detecting client connection');

	const sendGroceryItems = async () => {
        try {
            const items = await groceryModel.find({});
            socket.emit('groceryItems', items);
        } catch (err) {
            console.log('Error fetching grocery items:', err);
            socket.emit('errorFetchingGroceryItems', err.message);
        }
    };

    sendGroceryItems();
	
	socket.on('addGroceryItem', (groceryItem) => {
		const newGroceryItem = new groceryModel(groceryItem);
		newGroceryItem.save()
			.then(doc => {
				console.log('New grocery item added:', doc);
				socket.emit('groceryItemAdded', doc);
			})
			.catch(err => {
				console.log('Error adding grocery item:', err);
				socket.emit('errorAddingGroceryItem', err.message);
			});
	});

	socket.on('deleteGroceryItem', async (targetItem) => {
		try{
			const deletedItem = await groceryModel.findOneAndDelete({item:targetItem});
			if (!deletedItem) {
				throw new Error('Item not found');
			}
			console.log('Grocery item deleted: ', deletedItem);
			sendGroceryItems();
		} catch (err) {
			console.log('Error deleting grocery item: ', err.message);
		}
	});
});

http.listen(3000, () => {
	console.log('Server is running on port 3000');
});