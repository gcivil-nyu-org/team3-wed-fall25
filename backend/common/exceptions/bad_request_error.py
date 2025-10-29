class BadRequestError(Exception):
    def __init__(self, message="Error", status=400):
        self.message = message
        self.status = status
        super().__init__(message)
