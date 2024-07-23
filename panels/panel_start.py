from panels.admin.panel_admin import Admin_Panel
from panels.train_employee.panel_train_staff import Train_Staff
from panels.regular_user import display_user_panel as display


def display_start_panel():
    "This method defines the programs main panel ."
    
    #make objects .
    admin = Admin_Panel() 
    train_staff_obj = Train_Staff()

    #get inputs .
    while True:
        print("Welcome! Please select the option : ")
        print("1. Admin")
        print("2. Train Staff")
        print("3. Regular User")
        print("4. Exit")

        user_type = input("Enter your choice : ")

        if user_type == "1":
            admin.admin_login()
            break
        
        elif user_type == "2":
            train_staff_obj.login()
            break
            
        elif user_type == "3":
            display.display_user_panel()
            break
            
        elif user_type == "4":
            print("Goodbye!")
            exit()
            
        else:
            print("Invalid choice! Please try again!\n")
            display_start_panel()
            break
 