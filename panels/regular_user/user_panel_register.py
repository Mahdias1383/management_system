from user import User
from  user_dict  import user_dict
from panels.regular_user import display_user_panel as display


class User_Register(User):
    "This class have methods for regular user's registration."
    
    def __init__(self, username="username", password=123, name="name", email="email"):
        super().__init__(username, password)
        self.name = name
        self.email = email


    def registration(self):
        "This method defines regular user's registration."
            
        #get inputs .
        while True:
            name = input("Enter name : ")
            email = input("Enter email : ")
            username = input("Enter username : ")
            password = input("Enter password : ")
            
            list_values = list(user_dict.values())
            
            #check if username exists or not .
            if any(user["username"] == username for user in list_values):
                print("The username is already exist! Please try again!\n")
                continue
            
            #check if email exits or not .
            if any(user["email"] == email for user in list_values):
                print("The email is already exist! Please try again!\n")
                continue
            
            #check the values to be not empty .
            if name == "" or username == "" or password == "" or email == "":
                print("Value of fields can not be empty !\n")
                continue

             #check if email format is valid .
            if "@" not in email:
                print("The email is not valid ! Please try again !\n")
                continue
            
            new_user = {"name":name, "email":email, "username": username, "password": password}
            user_dict[username]= new_user
            print("You registered successfully! Now you can logging in ...\n") 
            display.display_user_panel()
            