from user import User
from panels.regular_user.panel_shopping import Shopping_Panel
import panels.panel_start as start
from  user_dict  import user_dict
from panels.regular_user import display_user_panel as display


class User_Login(User):
    "This class have methods for regular user's login."
    
    def __init__(self, username="username", password=123):
        super().__init__(username, password)
        self.shopping = Shopping_Panel()


    def login(self):
        "This method defines the regular users login operation."
        
        #get inputs .
        while True:
            choice = input("Do you want to back to the Main Panel or continue to login Panel (yes/no) ? : ").strip().lower()
        
            #get back to the main panel .
            if choice == "yes":
                start.display_start_panel()
        
            else:
                #get user username & password .
                username = input("Enter username : ")
                password = input("Enter password : ")

                #no registration before .
                if len(user_dict) == 0:
                    print("There is no users! Please complete the registration first!\n")
                    display.display_user_panel()
                
                #check if the entered credentials match any user in the dictionary .
                if any(username == user["username"] and password == user["password"] for user in user_dict.values()):
                    print(f"You logged in successfully!\nWelcome {username} .\n")
                    self.shopping.display_shopping_panel()
                    break  # Exit the loop after successful login
                
                #wrong values .
                else:
                    print("Username or Password is incorrect. Please try again!\n")  
                    continue
                 