from user import User
from panels.train_employee.panel_train_staff import train_dic
from user_dict import user_dict
from panels.regular_user import display_user_panel as display

class Shopping_Panel(User):
    "This class have methods for regular user that can buy tickets after sign in."
    
    def __init__(self, username = "username", password = 123, name = "name", email = "email"):
        super().__init__(username, password)
        self.name = name
        self.email = email
        self.balance = 0
        self.ticket = 0
        self.train = ""
        
    
    def add_money(self):
        "This method defines that user can increase the wallet balance."
        
        #get inputs.
        while True:
            print(f"Your wallet balance is : ${self.balance}")
            choice = input(f"Do you want to increase your balance (yes/no) : ").strip().lower()
            
            if choice == "yes":
                amount = input("Enter the amount you want add to your balance : ").strip()
                
                if amount == '':
                    print("Please enter a valid amount!\n")
                    continue
                
                elif amount < 0:
                    print("Please enter a valid amount!\n")
                    continue
                
                else:
                    amount = float(amount)
                    self.balance += amount
                    
            elif choice == "no":
                self.display_wallet_panel()
                
            else:
                print("Wrong choice! Please try again!\n")
                self.add_money()
            
            def get_back():
                "back to the main panel."
                
                choice =input("Do you want to get back (yes/no) ? : ").strip().lower()
                
                if choice == "yes":
                    self.display_wallet_panel()
                    
                elif choice == "no":
                    self.add_money()
                    
                else:
                    get_back()
            
            get_back()
            
    
    def decrease_money(self):
        "This method defines that user can decrease the wallet balance."
        
        #get inputs.
        while True:
            print(f"Your wallet balance is : ${self.balance} .")
            choice = input(f"Do you want to decrease your balance (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                amount = float(input("Enter the amount you want decrease balance : "))
                
                if amount <= self.balance:
                    print("Your entered amount decreased successfully!")
                    self.balance -= amount
                    print(f"Your wallet balance is : ${self.balance} .\n")
                    
                else:
                    print("Your entered amount more than your balance! Please try again!\n")
                    self.decrease_money()
                    
            elif choice == "no":
                self.display_wallet_panel()
                
            else:
                print("Wrong choice! Please try again!\n")
                self.decrease_money()
                
            def get_back():
                    "back to the main panel."
                    
                    choice =input("Do you want to get back (yes/no) ? : ").strip().lower()
                    
                    if choice == "yes":
                        self.display_wallet_panel()
                        
                    elif choice == "no":
                        self.add_money()
                        
                    else:
                        get_back()
            
            get_back()
        
    
    def user_shopping(self):
        "This method defines the regular user's buying tickets operation."
        
        def get_back():
            "back to the main panel."
            
            choice = input("Do you want continue to shopping (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                self.user_shopping()
            
            elif choice == "no":
                self.display_shopping_panel()
            
            else: 
                print("Wrong choice ! Please try again!\n")
                get_back()

        #shows trains information .
        if train_dic == {}:
            print("There are no train")
            self.display_shopping_panel()
            
        else:
            print("Available Trains : ")
            
            for k,v in train_dic.items():
                print(f"{k}:{v}" , end = "\n")
                
            #get train id from user .
        while True:
            Id_train = input("Enter Id of train : ").strip().lower()
            
            if Id_train not in train_dic.keys():
                print("Train ID not found! Please Try again! \n") 
                continue
            
            else:
                print("Train found successfully!")
                break
            
        #get the count of tickets .
        while True:
            self.ticket =  int(input("Please Enter count of tickets you want to buy : "))
            if self.ticket <= 0 or not isinstance(self.ticket, int):
                print("Count of tickets must more than zero or must be integer!\n")
                continue
            else:
                break

        #check if capacity is available .
        if self.ticket <= train_dic[Id_train]["capacity"]:
            print(f"There are {self.ticket} train capacity with Id_train: {Id_train}!")
            print(f'The price of ticket is  ${train_dic[Id_train]["cost_ticket"]}')

            #available capacity .
            choice = input("Do you want to buy ticket (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                cost_ticket = self.ticket * train_dic[Id_train]["cost_ticket"]
                print(f"tickets = {self.ticket} \n cost_ticket = {cost_ticket} \n")
                
                #checks the user's wallet balance for pay the tickets .
                if cost_ticket <= self.balance:
                    print("You bought the tickets successfully!\n")
                    self.train = Id_train
                    
                    #update user's wallet balance and train capacity .
                    self.balance -= cost_ticket
                    train_dic[Id_train]["capacity"] -= self.ticket
                    print(f"Your wallet balance is : ${self.balance}")
                    get_back()
                    
                else:
                    print("Your balance is low!\n")
                    self.display_wallet_panel()
                    
        #not available capacity .      
        else: 
            print(f"There are not {self.ticket} train capacity with {Id_train}!")
            print(f"Sorry! You can not buy ticket from this train!\n")
            get_back()
              

    def edit_profile(self):
        "This method defines that regular user can edit the personal or account information."
        
        def get_back():
            "get back to the main panel."
            
            choice = input("Do you want to return (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                Shopping_Panel.display_shopping_panel(self)
                
            elif choice == "no":
                Shopping_Panel.edit_profile(self)
                
            else:
                print("Wrong choice! Please try again!\n")
                get_back()
                
        while True:
            #checks the username is valid or not.
            username = input("Enter username: ")
            if any(user["username"] == username for user in user_dict.values()):
                print("Your username found successfully!\n")
                break
            
            else:
                print("Your entered username not found! Please try again!\n")
                continue
        
        #the edit panel .
        print("choose the option : \n1. Edit name \n2. Edit email \n3. Edit username \n4. Edit password \n5. exit")
        
        choice = input("Enter your choice : ").strip()

        #update the user's name .
        if choice == "1":
            new_name = input("Enter your new name : ")    
            choice = input("Do you want to update name (yes/no) ? : ").strip().lower()
            
            if choice == "yes":
                user_dict[username]["name"] = new_name
                print("Your name was updated successfully!\n")
            
            else:  
                get_back()
        
        #update the user's email .
        elif choice == "2":
            while True:
                new_email = input("Enter new email : ").strip().lower()
            
                if any(user["email"] == new_email for user in user_dict.values()):
                    print("The email is already exist! Please try again!\n")
                    continue
            
                else:
                    break
             
            choice = input("Do you want to update email (yes/no) ? : ").strip()
            
            if choice == "yes":
                user_dict[username]["email"] = new_email    
                print("Your email updated successfully!\n")
            
            else:  
                get_back()

        #update the user's username .
        elif choice == "3":
            while True:
                new_username = input("Enter new username : ").strip().lower()
        
                if any(user["username"] == new_username for user in user_dict.values()):
                    print("The username is already exist! Please try again!\n")
                    continue
        
                else:
                    break
                
            choice = input("Do you want to update username (yes/no) ? : ").strip()
        
            if choice == "yes":
                user_dict[new_username] = user_dict.pop(username)
                user_dict[new_username]["username"] = new_username
                print("Your username updated successfully!\n")
                
            else: 
                get_back()

        #update the user's password .
        elif choice == "4":
            new_password = input("Enter new password : ").strip()
            choice = input("Do you want to update password (yes/no) ? : ").strip().lower()
        
            if choice == "yes":
                user_dict[username]["password"] = new_password
                print("Your password updated successfully!")
        
            else: 
                get_back()
        
        else:
            get_back()

        get_back()
 
    
    def display_shopping_panel(self):
        "This method defines the shopping panel for regular user after login."
        
        #get inputs.
        print("1. Buy Ticket\n2. Wallet\n3. Edit Profile\n4. LogOut")
        
        choice = input("Choose the option: ")
        if choice == "1":
            self.user_shopping()
            
        elif choice == "2":
            self.display_wallet_panel()
        
        elif choice == "3":
            self.edit_profile()
        
        elif choice == "4":
            display.display_user_panel()
        
        else:
            print("Wrong choice! Please try again!\n")
            self.display_shopping_panel()

           
    def display_wallet_panel (self):
        "This method defines the regular user's wallet panel."
        
        #get inputs .
        print("1. Increase balance\n2. Decrease balance\n3. Show balance\n4. return")
        
        choice = input("Choose the option : ").strip().lower()
       
        if choice == "1":
            self.add_money()
       
        elif choice == "2":
            self.decrease_money()
       
        elif choice == "3":
            print(f"Your wallet balance is ${self.balance} .")
            self.display_wallet_panel()
       
        elif choice == "4":
            while True:
                choice = input("Do you want to back (yes/no) ? : ").lower()
                
                if choice == "yes":
                    Shopping_Panel.display_shopping_panel(self)
                
                elif choice == "no": 
                    Shopping_Panel.display_wallet_panel(self)
                
                else:
                    print("Wrong choice! Please try again! \n")
                    continue
        
        else:
            print("Wrong choice! Please try again!\n")
            self.display_wallet_panel()
            