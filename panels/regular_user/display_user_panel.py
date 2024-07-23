import panels.panel_start as start
from panels.regular_user.user_panel_register import User_Register
from panels.regular_user.user_panel_login import User_Login

def display_user_panel():
    "This method defines showing the user panel and pass the user to the right option."
    
    #make objects.
    register = User_Register()
    login = User_Login()
    
    #get inputs and pass user.
    while True:
        print("1. Register\n2. Sign in\n3. Back")
        choice = input("Choose the option: ")
            
        if choice == "1":
            register.registration()
            
        elif choice == "2":
            login.login()

        elif choice == "3":
            start.display_start_panel()

        else:
            print("Wrong number! Please try again!\n")
            continue
        