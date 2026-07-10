from pymongo import MongoClient

client = None
db = None

def init_db(mongo_uri, db_name):
    global client, db
    client = MongoClient(mongo_uri)
    db = client[db_name]
    return db

def get_db():
    return db
