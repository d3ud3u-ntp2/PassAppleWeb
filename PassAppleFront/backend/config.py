import os

class Config:
    UPLOAD_FOLDER = 'uploads'
    PORT = 5000
    DEBUG = True

    @classmethod
    def init_app(cls):
        if not os.path.exists(cls.UPLOAD_FOLDER):
            os.makedirs(cls.UPLOAD_FOLDER)
